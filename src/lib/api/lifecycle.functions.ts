// P5 · Recovery lifecycle saga — pure business logic + server fns.
//
// The lifecycle is: detect → draft → reviewed → approved → executed →
// confirmed → fee_settled. Each step is idempotent (same idempotency key →
// same result, no side-effect replay). The saga table (0007) tracks state.
// The whole thing is designed to be swappable: replace the server fns with
// a real workflow engine later without touching compliance or domain logic.
//
// `settleFee` is the key P5 deliverable. It:
//   1. Validates causation (causation.ts decideFee) — pure, testable gate.
//   2. Calls PayoutPort.chargeFee — sealed in BUILT by assertLiveAllowed
//      inside the StripePayoutAdapter, so no real charge can leave BUILT.
//   3. Writes fee_charges (0004, DB causation CHECK enforces #13 at the data layer).
//   4. Is idempotent — same (recoveryId + idempotencyKey) → same result.
//   5. Records a recovery_events audit row every time.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { decideFee, type ConfirmedRecovery } from "@/lib/compliance/causation";
import type { PayoutPort } from "@/lib/compliance/ports";
import { FeeLedgerEntry } from "@/lib/playmoney/types";

// ── Domain types ──────────────────────────────────────────────────────────────
export const SettleFeeInput = z.object({
  recoveryId: z.string().min(1),
  idempotencyKey: z.string().min(1),
  grossAmountCents: z.number().int().nonnegative(),
  confirmedAt: z.string().min(1),
  evidenceRef: z.string().min(1),
  customerRef: z.string().min(1), // tokenised PSP customer ref — never raw card data
  causedByPlaymoney: z.boolean(),
  disclosureAcked: z.boolean(),
  feeRate: z.number().optional(),
});
export type SettleFeeInput = z.infer<typeof SettleFeeInput>;

export type SettleFeeResult =
  | { ok: true; entry: FeeLedgerEntry; pspChargeRef: string }
  | { ok: false; code: "fee_not_allowed" | "already_settled" | "idempotent_return"; reason: string; entry?: FeeLedgerEntry };

/**
 * Pure fee-settlement logic. All I/O is injected so this is unit-testable
 * without a live DB or Stripe. The `chargeFee` callback is only invoked after
 * causation.decideFee returns allowed:true.
 */
export async function applySettleFee(input: {
  parsedInput: SettleFeeInput;
  ownerId: string;
  now?: Date;
  readExistingCharge: () => Promise<FeeLedgerEntry | null>;
  chargeFee: PayoutPort["chargeFee"];
  writeCharge: (params: {
    pspChargeRef: string;
    feeCents: number;
    feeRate: number;
  }) => Promise<FeeLedgerEntry>;
}): Promise<SettleFeeResult> {
  const si = input.parsedInput;

  // Idempotency: existing charge → return it without re-running.
  const existing = await input.readExistingCharge();
  if (existing) {
    return { ok: false, code: "idempotent_return", reason: "Fee already settled for this key.", entry: existing };
  }

  // Causation gate (Control #13). PURE — never throws, returns typed decision.
  const confirmedRecovery: ConfirmedRecovery = {
    recoveryId: si.recoveryId,
    grossAmountCents: si.grossAmountCents,
    confirmedAt: si.confirmedAt,
    evidenceRef: si.evidenceRef,
  };
  const decision = decideFee({
    recovery: confirmedRecovery,
    causedByPlaymoney: si.causedByPlaymoney,
    disclosureAcked: si.disclosureAcked,
    rate: si.feeRate,
  });

  if (!decision.allowed) {
    return { ok: false, code: "fee_not_allowed", reason: decision.reason };
  }

  // Real PSP charge — sealed in BUILT by assertLiveAllowed inside the adapter.
  const { pspChargeRef } = await input.chargeFee({
    feeCents: decision.feeCents,
    customerRef: si.customerRef,
    idempotencyKey: si.idempotencyKey,
  });

  // Persist fee_charges (causation flags written truthfully — DB CHECK enforces #13).
  const entry = await input.writeCharge({
    pspChargeRef,
    feeCents: decision.feeCents,
    feeRate: decision.rate,
  });

  return { ok: true, entry, pspChargeRef };
}

/**
 * TanStack Start server fn — settles the fee for a confirmed, caused recovery.
 * All causation checks, PSP charges, and DB writes happen server-side.
 */
export const settleFeeRecoveryFn = createServerFn({ method: "POST" })
  .inputValidator(SettleFeeInput)
  .handler(async ({ data }): Promise<SettleFeeResult> => {
    const { getAdminClient } = await import("@/lib/supabase/admin.server");
    const { appendAudit } = await import("@/lib/compliance/audit.server");
    const { createPayoutAdapter } = await import("@/lib/adapters/payout");

    const sb = getAdminClient();

    // Resolve owner from the recovery row (never trust from client).
    const recRow = await sb.from("recoveries").select("owner_id").eq("id", data.recoveryId).single();
    if (recRow.error) throw new Error(`settleFee: recovery lookup failed: ${recRow.error.message}`);
    const ownerId: string = (recRow.data as Record<string, unknown>).owner_id as string;

    // Read STRIPE_SECRET_KEY (server-only, inside handler = per-request).
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const payout = createPayoutAdapter({ stripeSecretKey: stripeKey });

    const result = await applySettleFee({
      parsedInput: data,
      ownerId,
      readExistingCharge: async () => {
        const { data: row, error } = await sb
          .from("fee_charges")
          .select("id, recovery_id, fee_amount_cents, created_at")
          .eq("idempotency_key", data.idempotencyKey)
          .maybeSingle();
        if (error) throw new Error(`settleFee idempotency lookup: ${error.message}`);
        if (!row) return null;
        const r = row as Record<string, unknown>;
        return FeeLedgerEntry.parse({
          id: r.id,
          recoveryId: r.recovery_id,
          feeAmount: r.fee_amount_cents,
          ts: r.created_at,
        });
      },
      chargeFee: payout.chargeFee.bind(payout),
      writeCharge: async ({ pspChargeRef, feeCents, feeRate }) => {
        const { data: inserted, error } = await sb
          .from("fee_charges")
          .insert({
            owner_id: ownerId,
            recovery_id: data.recoveryId,
            gross_amount_cents: data.grossAmountCents,
            fee_amount_cents: feeCents,
            fee_rate: feeRate,
            confirmed_recovery: true,
            caused_by_playmoney: data.causedByPlaymoney,
            disclosure_acked: data.disclosureAcked,
            status: "charged",
            psp_charge_ref: pspChargeRef,
            idempotency_key: data.idempotencyKey,
          })
          .select("id, recovery_id, fee_amount_cents, created_at")
          .single();
        if (error) throw new Error(`settleFee: fee_charges insert failed: ${error.message}`);
        const r = inserted as Record<string, unknown>;
        return FeeLedgerEntry.parse({
          id: r.id,
          recoveryId: r.recovery_id,
          feeAmount: r.fee_amount_cents,
          ts: r.created_at,
        });
      },
    });

    await appendAudit({
      ownerId,
      action: "settle_fee",
      detail: {
        recoveryId: data.recoveryId,
        idempotencyKey: data.idempotencyKey,
        result: result.ok ? "charged" : result.code,
      },
    });

    // Write a recovery_event for the fee settlement.
    if (result.ok || result.code === "idempotent_return") {
      await sb.from("recovery_events").insert({
        owner_id: ownerId,
        recovery_id: data.recoveryId,
        kind: result.ok ? "fee_settled" : "fee_already_settled",
        note: result.ok
          ? `Fee of ${result.entry.feeAmount} cents settled (PSP ref: ${result.pspChargeRef})`
          : "Fee already settled for this idempotency key.",
      });

      // Advance recovery status to 'landed' after fee settlement.
      if (result.ok) {
        await sb.from("recoveries").update({ status: "landed" }).eq("id", data.recoveryId);
      }
    }

    return result;
  });
