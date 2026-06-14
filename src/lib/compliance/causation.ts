// M4 · Fee-Causation engine (Control #13) [GATE]
//
// PlayMoney bills ONLY recoveries it materially caused. A fee is impossible
// unless ALL of: the recovery is a ConfirmedRecovery, it was caused by
// PlayMoney, and the consumer acknowledged the "you may be able to do this
// yourself for free" disclosure. Fee = a fresh PSP merchant charge (see
// money.ts FeeCharge) — never netted from funds in transit (#2).

import { z } from "zod";
import { cents, type Cents } from "./money";

/** Plain-language disclosure required in the fee UI (#13). */
export const DIY_FREE_DISCLOSURE =
  "You may be able to do this yourself for free. PlayMoney only charges a fee on recoveries we actually obtain for you.";

/** Fee benchmark band. Default 25%, configurable within 20-30%. */
export const FEE_RATE = { min: 0.2, default: 0.25, max: 0.3 } as const;

export function validateFeeRate(rate: number): number {
  if (!(rate >= FEE_RATE.min && rate <= FEE_RATE.max)) {
    throw new Error(`Fee rate ${rate} outside benchmark band ${FEE_RATE.min}-${FEE_RATE.max}`);
  }
  return rate;
}

export function computeFee(grossCents: number, rate: number = FEE_RATE.default): Cents {
  validateFeeRate(rate);
  return cents(Math.round(grossCents * rate));
}

/**
 * A tight, testable definition of a recovery PlayMoney may bill on: it actually
 * landed, with an evidence reference and a confirmation timestamp.
 */
export const ConfirmedRecovery = z.object({
  recoveryId: z.string().min(1),
  grossAmountCents: z.number().int().nonnegative(),
  confirmedAt: z.string().min(1),
  evidenceRef: z.string().min(1), // proof the recovery actually occurred
});
export type ConfirmedRecovery = z.infer<typeof ConfirmedRecovery>;

export function isConfirmedRecovery(input: unknown): input is ConfirmedRecovery {
  return ConfirmedRecovery.safeParse(input).success;
}

export type FeeDecision =
  | { allowed: true; feeCents: number; rate: number }
  | { allowed: false; code: FeeBlockCode; reason: string };

export type FeeBlockCode =
  | "not_confirmed_recovery"
  | "not_caused_by_playmoney"
  | "disclosure_not_acked";

/**
 * The fee gate. Returns allowed:true (with the computed fee) ONLY when the
 * recovery is confirmed, caused by PlayMoney, and the DIY disclosure was acked.
 * Pure + total — never throws on the gate path (T2).
 */
export function decideFee(input: {
  recovery: unknown;
  causedByPlaymoney: boolean;
  disclosureAcked: boolean;
  rate?: number;
}): FeeDecision {
  if (!isConfirmedRecovery(input.recovery)) {
    return { allowed: false, code: "not_confirmed_recovery", reason: "Recovery is not confirmed" };
  }
  if (!input.causedByPlaymoney) {
    return {
      allowed: false,
      code: "not_caused_by_playmoney",
      reason: "Recovery was not materially caused by PlayMoney",
    };
  }
  if (!input.disclosureAcked) {
    return {
      allowed: false,
      code: "disclosure_not_acked",
      reason: "Consumer has not acknowledged the do-it-yourself-free disclosure",
    };
  }
  const rate = validateFeeRate(input.rate ?? FEE_RATE.default);
  return { allowed: true, feeCents: computeFee(input.recovery.grossAmountCents, rate), rate };
}
