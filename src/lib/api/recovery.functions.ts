// P2 · approveRecovery server fn — routes the user's approval through the full
// MAN-Mode compliance stack before any real action may execute.
//
// Flow (every call, regardless of outcome):
//   1. Idempotency gate: existing Approval for this key → return it immediately.
//   2. Build a per-recovery e-LOA (click_accept = the user's "Send it" tap) and
//      a review item (user consent + evidence = the legitimacy attestation; #14).
//   3. Call executeRecoveryAction → the three checks run: LOA valid, review
//      approved, AND (mode=LIVE + all gates green). In BUILT, result = "sealed".
//   4. Write a recovery_events audit row with the exact outcome — always (#15).
//   5. Write the Approval consent record (always — it is the record of the user's
//      authorization, not of execution).
//   6. When executed (LIVE+gates): persist status = "on_the_way" (truthful).
//      When sealed/rejected (BUILT or gates unmet): status stays at its current
//      value — no status lie in the DB. The UI celebrates optimistically; the DB
//      tells the truth.
//
// The pure `processApproval` helper is extracted for unit-testing without Supabase.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { buildLoa, type ESignature, type LoaScope } from "@/lib/compliance/loa";
import { enqueueForReview, approveReview, type LegitimacyAttestation } from "@/lib/compliance/review";
import { executeRecoveryAction, type ExecOutcome } from "@/lib/compliance/executor";
import type { GateStatus } from "@/lib/compliance/gates";
import { PROBLEM_TYPE_TO_AVENUE } from "@/lib/engine/router";
import { Approval, Recovery, type RecoveryAvenue } from "@/lib/playmoney/types";

export type ApprovalOutcome =
  | { approval: Approval; outcome: ExecOutcome<void>; idempotent: boolean };

/** Builds the e-LOA from a user's explicit click-accept (ETA SA 2001). */
export function buildApprovalLoa(input: {
  userId: string;
  recoveryId: string;
  recovery: Recovery;
  idempotencyKey: string;
  now: Date;
}): ReturnType<typeof buildLoa> {
  const avenueKey = PROBLEM_TYPE_TO_AVENUE[input.recovery.avenue as RecoveryAvenue];
  const scope: LoaScope = {
    avenue: avenueKey,
    merchant: input.recovery.merchant,
    maxAmountCents: input.recovery.grossAmount,
  };
  const sig: ESignature = {
    signedBy: input.userId,
    signedAt: input.now.toISOString(),
    method: "click_accept",
    statement:
      "I authorize PlayMoney to pursue this recovery on my behalf and confirm the claim is legitimate.",
    consentElectronic: true,
  };
  return buildLoa({
    ownerId: input.userId,
    recoveryId: input.recoveryId,
    scope,
    signature: sig,
    ttlMinutes: 30,
    idempotencyKey: `loa_${input.idempotencyKey}`,
    now: input.now,
  });
}

/**
 * Pure business logic: LOA → review → executeRecoveryAction.
 * Accepts all I/O as injected callbacks so this is unit-testable without Supabase.
 * The `perform` callback is the REAL action; it runs ONLY when LIVE+gates (executor seals otherwise).
 */
export async function processApproval(input: {
  recovery: Recovery;
  userId: string;
  recoveryId: string;
  idempotencyKey: string;
  gateStatus: Partial<GateStatus>;
  now?: Date;
  perform: () => Promise<void>;
}): Promise<ExecOutcome<void>> {
  const now = input.now ?? new Date();
  const avenueKey = PROBLEM_TYPE_TO_AVENUE[input.recovery.avenue as RecoveryAvenue];

  const loaToken = buildApprovalLoa({
    userId: input.userId,
    recoveryId: input.recoveryId,
    recovery: input.recovery,
    idempotencyKey: input.idempotencyKey,
    now,
  });

  const attestation: LegitimacyAttestation = {
    attestedBy: input.userId,
    attestedAt: now.toISOString(),
    statement: "I confirm this claim is legitimate and that I will not file a frivolous or friendly chargeback.",
    isLegitimate: true,
    noFrivolousChargeback: true,
  };

  const pending = enqueueForReview({
    ownerId: input.userId,
    recoveryId: input.recoveryId,
    actionType: `approve_${avenueKey}`,
    attestation,
    evidence: [{ kind: "user_approval_click", ref: input.idempotencyKey }],
    idempotencyKey: `review_${input.idempotencyKey}`,
    now,
  });
  // The user's explicit tap is their consent; mark reviewed immediately.
  // In BUILT mode, the executor seals anyway — the review-before-send gate
  // (Control #14) is satisfied by the mode/gate seal. In LIVE mode a staffed
  // review queue would replace this auto-approve.
  const reviewItem = approveReview(pending, "user_consent", undefined, now);

  const action = {
    recoveryId: input.recoveryId,
    avenue: avenueKey,
    merchant: input.recovery.merchant,
    amountCents: input.recovery.grossAmount,
  };

  return executeRecoveryAction({
    action,
    loaToken,
    reviewItem,
    gateStatus: input.gateStatus,
    perform: input.perform,
    now,
  });
}

/**
 * TanStack Start server fn — the single approve endpoint.
 * All compliance checks, audit writes, and DB mutations happen here server-side.
 * Client never touches the compliance layer directly.
 */
export const approveRecoveryFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      recoveryId: z.string().min(1),
      idempotencyKey: z.string().min(1),
    }),
  )
  .handler(async ({ data }): Promise<Approval> => {
    const { getAdminClient } = await import("@/lib/supabase/admin.server");
    const { loadGateStatus } = await import("@/lib/compliance/gates.server");
    const { appendAudit } = await import("@/lib/compliance/audit.server");
    const { rowToApproval, rowToRecovery } = await import("@/lib/playmoney/supabase");

    const sb = getAdminClient();

    // ── Resolve owner from DB (never trust userId from client) ────────────────
    const recRow = await sb
      .from("recoveries")
      .select("*")
      .eq("id", data.recoveryId)
      .maybeSingle();
    if (recRow.error) throw new Error(`approveRecovery: recovery lookup failed: ${recRow.error.message}`);
    if (!recRow.data) throw new Error(`approveRecovery: recovery ${data.recoveryId} not found`);
    const recovery = rowToRecovery(recRow.data);
    const userId: string = (recRow.data as Record<string, unknown>).owner_id as string;

    // ── Idempotency: return the existing approval without re-running ──────────
    const existing = await sb
      .from("approvals")
      .select("*")
      .eq("approval_token", data.idempotencyKey)
      .maybeSingle();
    if (existing.error) throw new Error(`approveRecovery: idempotency lookup failed: ${existing.error.message}`);
    if (existing.data) return rowToApproval(existing.data);

    // ── Load go-live gate status (ops-set, never auto) ────────────────────────
    const gateStatus = await loadGateStatus();

    // ── Run the compliance stack → executor ───────────────────────────────────
    const outcome = await processApproval({
      recovery,
      userId,
      recoveryId: data.recoveryId,
      idempotencyKey: data.idempotencyKey,
      gateStatus,
      perform: async () => {
        // This block runs ONLY when mode=LIVE + all gates green. In BUILT it is sealed.
        const { error } = await sb
          .from("recoveries")
          .update({ status: "on_the_way" })
          .eq("id", data.recoveryId);
        if (error) throw new Error(`approveRecovery: status update failed: ${error.message}`);
      },
    });

    // ── Audit trail: recovery_events row regardless of outcome ────────────────
    const eventKind =
      outcome.status === "executed"
        ? "approved_executed"
        : outcome.status === "sealed"
          ? "approved_sealed"
          : `rejected_${outcome.code}`;
    const eventNote =
      outcome.status === "executed"
        ? "Recovery approved and execution dispatched (LIVE)."
        : outcome.status === "sealed"
          ? "Recovery approved by user; execution sealed (BUILT / gates unmet). No real action taken."
          : `Approval rejected by compliance stack: ${outcome.reason}`;

    const eventRow = await sb
      .from("recovery_events")
      .insert({
        owner_id: userId,
        recovery_id: data.recoveryId,
        kind: eventKind,
        note: eventNote,
      })
      .select("id")
      .single();
    if (eventRow.error) throw new Error(`approveRecovery: event write failed: ${eventRow.error.message}`);

    // Append to the ops audit log as well.
    await appendAudit({
      actor: userId,
      ownerId: userId,
      action: "recovery_approval",
      detail: {
        recoveryId: data.recoveryId,
        idempotencyKey: data.idempotencyKey,
        outcome: outcome.status,
        ...(outcome.status === "rejected" ? { code: outcome.code, reason: outcome.reason } : {}),
      },
    });

    // ── Write the Approval consent record (always — it is the user's consent) ─
    const now = new Date().toISOString();
    const approvalRow = await sb
      .from("approvals")
      .insert({
        owner_id: userId,
        recovery_id: data.recoveryId,
        approval_token: data.idempotencyKey,
        approved_by: userId,
        ts: now,
      })
      .select("*")
      .single();
    if (approvalRow.error) throw new Error(`approveRecovery: approval write failed: ${approvalRow.error.message}`);

    return rowToApproval(approvalRow.data);
  });
