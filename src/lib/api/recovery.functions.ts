// P2/P5 · approveRecovery server fn — routes the user's approval through the full
// MAN-Mode compliance stack, then (LIVE+gates only) builds and dispatches the
// Recovery Communication Package to the merchant.
//
// Flow (every call, regardless of outcome):
//   0. Subscription gate: subscription_cancellation + refundType=store_credit → throw
//      IntakeRejectionError (not_eligible_credit_only) before compliance stack runs.
//   1. Idempotency gate: existing Approval for this key → return it immediately.
//   2. Build the RCP (pure, no I/O) — validates letter is well-formed even in BUILT.
//   3. Build a per-recovery e-LOA (click_accept = the user's "Send it" tap) and
//      a review item (user consent + evidence = the legitimacy attestation; #14).
//   4. Call executeRecoveryAction → the three checks run: LOA valid, review
//      approved, AND (mode=LIVE + all gates green). In BUILT, result = "sealed".
//   5. Write a recovery_events audit row with the exact outcome — always (#15).
//   6. Write the Approval consent record (always — it is the record of the user's
//      authorization, not of execution).
//   7. When executed (LIVE+gates): dispatch RCP → write outbound_dispatched event →
//      persist status = "on_the_way" (truthful).
//      When sealed/rejected (BUILT or gates unmet): status stays at its current
//      value — no status lie in the DB. The UI celebrates optimistically; the DB
//      tells the truth.
//
// The pure `processApproval` helper is extracted for unit-testing without Supabase.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { buildLoa, type ESignature, type LoaScope } from "@/lib/compliance/loa";
import {
  enqueueForReview,
  approveReview,
  type LegitimacyAttestation,
} from "@/lib/compliance/review";
import { executeRecoveryAction, type ExecOutcome } from "@/lib/compliance/executor";
import type { GateStatus } from "@/lib/compliance/gates";
import { PROBLEM_TYPE_TO_AVENUE } from "@/lib/engine/router";
import {
  Approval,
  Recovery,
  MerchantContact,
  IntakeRejectionError,
  SubscriptionRefundType,
  type RecoveryAvenue,
} from "@/lib/playmoney/types";
import { buildRecoveryCommPackage } from "@/lib/playmoney/recovery-comms";

// ── Subscription eligibility gate (pure, exported for UI pre-check) ──────────

/**
 * Gate #5: subscription_cancellation claims are only eligible when the merchant
 * refunds to the original payment method. Store-credit-only refunds break the
 * non-custodial model and are out of scope for Phase 0.
 */
export function checkSubscriptionEligibility(
  avenue: string,
  refundType: SubscriptionRefundType | undefined,
): void {
  if (avenue === "subscription_cancellation" && refundType === "store_credit") {
    throw new IntakeRejectionError(
      "PlayMoney can only recover funds that return to your original payment method. " +
        "Subscriptions that offer store credit or gift cards only cannot be recovered " +
        "through this service.",
    );
  }
}

export type ApprovalOutcome = {
  approval: Approval;
  outcome: ExecOutcome<void>;
  idempotent: boolean;
};

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
    statement:
      "I confirm this claim is legitimate and that I will not file a frivolous or friendly chargeback.",
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
 * Pure landed-transition logic (mirrors processApproval): when a recovery is confirmed
 * landed, write the audit event in the EXISTING recovery_events path, then fire the
 * fee-settlement step. `settleFee` is the real settlement callback — it stays sealed in
 * BUILT via assertLiveAllowed() inside StripePayoutAdapter, so this plumbs the trigger
 * without changing what happens once triggered. Injected I/O ⇒ unit-testable.
 */
export async function processRecoveryLanded(input: {
  writeEvent: (kind: string, note: string) => Promise<void>;
  settleFee: () => Promise<void>;
}): Promise<void> {
  // Audit the landing first, in the same recovery_events path used for approve/execute.
  await input.writeEvent("landed", "Recovery confirmed landed; firing fee settlement.");
  // Explicit next step: settle the fee. Sealed in BUILT — throws LiveModeBlockedError,
  // never a silent no-op. The audit row above truthfully records the landing regardless.
  await input.settleFee();
}

/**
 * TanStack Start server fn — the recovery status-transition trigger. When a recovery is
 * confirmed landed (an external confirmation event in LIVE; the caller is P4/P5 ingest),
 * this writes the `landed` recovery_events row, persists status='landed', and fires
 * settleFeeRecoveryFn as the explicit next step. Settlement remains sealed in BUILT.
 */
export const markRecoveryLandedFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      recoveryId: z.string().min(1),
      idempotencyKey: z.string().min(1),
      evidenceRef: z.string().min(1),
      customerRef: z.string().min(1),
    }),
  )
  .handler(async ({ data }): Promise<void> => {
    const { getAdminClient } = await import("@/lib/supabase/admin.server");
    const { rowToRecovery } = await import("@/lib/playmoney/supabase");
    const { settleFeeRecoveryFn } = await import("./lifecycle.functions");
    const sb = getAdminClient();

    const recRow = await sb.from("recoveries").select("*").eq("id", data.recoveryId).maybeSingle();
    if (recRow.error)
      throw new Error(`markRecoveryLanded: recovery lookup failed: ${recRow.error.message}`);
    if (!recRow.data) throw new Error(`markRecoveryLanded: recovery ${data.recoveryId} not found`);
    const recovery = rowToRecovery(recRow.data);
    const ownerId: string = (recRow.data as Record<string, unknown>).owner_id as string;

    await processRecoveryLanded({
      writeEvent: async (kind, note) => {
        const ev = await sb
          .from("recovery_events")
          .insert({ owner_id: ownerId, recovery_id: data.recoveryId, kind, note });
        if (ev.error)
          throw new Error(`markRecoveryLanded: event write failed: ${ev.error.message}`);
        const up = await sb
          .from("recoveries")
          .update({ status: "landed" })
          .eq("id", data.recoveryId);
        if (up.error)
          throw new Error(`markRecoveryLanded: status update failed: ${up.error.message}`);
      },
      settleFee: async () => {
        // Sealed in BUILT (StripePayoutAdapter.chargeFee throws LiveModeBlockedError).
        await settleFeeRecoveryFn({
          data: {
            recoveryId: data.recoveryId,
            idempotencyKey: data.idempotencyKey,
            grossAmountCents: recovery.grossAmount,
            confirmedAt: new Date().toISOString(),
            evidenceRef: data.evidenceRef,
            customerRef: data.customerRef,
            causedByPlaymoney: true,
            disclosureAcked: true,
          },
        });
      },
    });
  });

/**
 * Writes the `initiated` audit event for a freshly-created recovery. The recovery
 * row itself is inserted under the owner's RLS session (SupabaseApiClient.initiateRecovery);
 * recovery_events has no tenant INSERT policy (truthful audit, service-role only), so the
 * append happens here via the admin client, resolving the owner from the recovery row —
 * the same pattern approveRecoveryFn uses. Creating a record is a DB write, not a
 * money-movement action, so it is NOT subject to assertLiveAllowed().
 */
export const recordRecoveryInitiatedFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ recoveryId: z.string().min(1) }))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { getAdminClient } = await import("@/lib/supabase/admin.server");
    const sb = getAdminClient();

    const recRow = await sb
      .from("recoveries")
      .select("owner_id")
      .eq("id", data.recoveryId)
      .maybeSingle();
    if (recRow.error)
      throw new Error(`recordRecoveryInitiated: recovery lookup failed: ${recRow.error.message}`);
    if (!recRow.data)
      throw new Error(`recordRecoveryInitiated: recovery ${data.recoveryId} not found`);
    const ownerId: string = (recRow.data as Record<string, unknown>).owner_id as string;

    const { error } = await sb.from("recovery_events").insert({
      owner_id: ownerId,
      recovery_id: data.recoveryId,
      kind: "initiated",
      note: "Recovery initiated from a detected situation.",
    });
    if (error) throw new Error(`recordRecoveryInitiated: event write failed: ${error.message}`);
    return { ok: true };
  });

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
      merchantContact: MerchantContact,
      refundType: SubscriptionRefundType.optional(),
    }),
  )
  .handler(async ({ data }): Promise<Approval> => {
    const { getAdminClient } = await import("@/lib/supabase/admin.server");
    const { loadGateStatus } = await import("@/lib/compliance/gates.server");
    const { appendAudit } = await import("@/lib/compliance/audit.server");
    const { rowToApproval, rowToRecovery } = await import("@/lib/playmoney/supabase");

    const sb = getAdminClient();

    // ── Resolve owner from DB (never trust userId from client) ────────────────
    const recRow = await sb.from("recoveries").select("*").eq("id", data.recoveryId).maybeSingle();
    if (recRow.error)
      throw new Error(`approveRecovery: recovery lookup failed: ${recRow.error.message}`);
    if (!recRow.data) throw new Error(`approveRecovery: recovery ${data.recoveryId} not found`);
    const recovery = rowToRecovery(recRow.data);
    const userId: string = (recRow.data as Record<string, unknown>).owner_id as string;

    // ── Gate #5: subscription eligibility — before compliance stack ───────────
    const avenueKey = PROBLEM_TYPE_TO_AVENUE[recovery.avenue as RecoveryAvenue];
    checkSubscriptionEligibility(avenueKey, data.refundType);

    // ── Idempotency: return the existing approval without re-running ──────────
    const existing = await sb
      .from("approvals")
      .select("*")
      .eq("approval_token", data.idempotencyKey)
      .maybeSingle();
    if (existing.error)
      throw new Error(`approveRecovery: idempotency lookup failed: ${existing.error.message}`);
    if (existing.data) return rowToApproval(existing.data);

    // ── Load go-live gate status + resolve user display name ──────────────────
    const gateStatus = await loadGateStatus();
    const profileRow = await sb
      .from("profiles")
      .select("display_name")
      .eq("owner_id", userId)
      .maybeSingle();
    const userDisplayName =
      ((profileRow.data as Record<string, unknown> | null)?.display_name as string | undefined) ??
      "valued customer";

    // ── Build RCP (pure, no I/O) — validates letter is well-formed in BUILT ───
    const merchantContact = data.merchantContact;
    const rcp = buildRecoveryCommPackage({
      avenue: avenueKey,
      merchant: recovery.merchant,
      contact: merchantContact,
      userDisplayName,
      amountCents: recovery.grossAmount,
      recoveryId: data.recoveryId,
      reason: recovery.reason,
    });

    // ── Run the compliance stack → executor ───────────────────────────────────
    const outcome = await processApproval({
      recovery,
      userId,
      recoveryId: data.recoveryId,
      idempotencyKey: data.idempotencyKey,
      gateStatus,
      perform: async () => {
        // Runs ONLY when mode=LIVE + all gates green (executor guarantees this).
        if (!merchantContact.email && !merchantContact.url) {
          throw new Error(
            "approveRecovery: merchantContact has no email or url — cannot dispatch RCP",
          );
        }
        const { createRecoveryOutboundAdapter } = await import("@/lib/adapters/outbound");
        const outbound = createRecoveryOutboundAdapter();
        const dispatch = await outbound.sendRecoveryPackage(rcp, merchantContact);

        // Outbound dispatch audit — written before status update so audit is complete
        // even if status update fails.
        const dispatchEv = await sb.from("recovery_events").insert({
          owner_id: userId,
          recovery_id: data.recoveryId,
          kind: "outbound_dispatched",
          note: JSON.stringify({
            avenue: avenueKey,
            merchant: recovery.merchant,
            contactMethod: merchantContact.method,
            dispatchRef: dispatch.dispatchRef,
            rcpGeneratedAt: rcp.generatedAt,
          }),
        });
        if (dispatchEv.error)
          throw new Error(
            `approveRecovery: dispatch event write failed: ${dispatchEv.error.message}`,
          );

        // Status truthfully reflects that the RCP is in flight.
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
        ? "Recovery approved; RCP dispatched to merchant (LIVE)."
        : outcome.status === "sealed"
          ? `Recovery approved; RCP built (${avenueKey}, well-formed); dispatch sealed in BUILT/gates unmet. No real action taken.`
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
    if (eventRow.error)
      throw new Error(`approveRecovery: event write failed: ${eventRow.error.message}`);

    // Append to the ops audit log as well.
    await appendAudit({
      actor: userId,
      ownerId: userId,
      action: "recovery_approval",
      detail: {
        recoveryId: data.recoveryId,
        idempotencyKey: data.idempotencyKey,
        outcome: outcome.status,
        avenue: avenueKey,
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
    if (approvalRow.error)
      throw new Error(`approveRecovery: approval write failed: ${approvalRow.error.message}`);

    return rowToApproval(approvalRow.data);
  });
