// M7 · Deferred-Avenue hard flags (Control #9)
//
// The registry exposes EXACTLY the four administrative avenues PlayMoney may
// pursue. Insurance / credit / DTC / US avenues are hard-DISABLED at the
// registry level — unreachable, not merely hidden in the UI. Requesting a
// disabled avenue returns a typed "avenue_disabled" error; no code path runs it.
//
// NB (decision D-002): the existing `RecoveryAvenue` enum in
// src/lib/playmoney/types.ts lists *problem types*, not these administrative
// avenues. This registry is the authoritative avenue gate; problem types map
// onto an enabled administrative avenue before any action executes.

export type AvenueKey =
  // —— the 4 enabled administrative avenues ——
  | "merchant_refund"
  | "fee_reversal"
  | "billing_error_correction"
  | "subscription_cancellation"
  // —— hard-disabled / deferred avenues ——
  | "insurance_claim"
  | "credit_dispute"
  | "dtc_recovery"
  | "us_recovery";

export interface AvenueDef {
  readonly key: AvenueKey;
  readonly label: string;
  readonly enabled: boolean;
  readonly reason?: string; // why disabled (for audit + UX)
}

export const AVENUE_REGISTRY: Readonly<Record<AvenueKey, AvenueDef>> = Object.freeze({
  merchant_refund: { key: "merchant_refund", label: "Merchant refund", enabled: true },
  fee_reversal: { key: "fee_reversal", label: "Fee reversal", enabled: true },
  billing_error_correction: {
    key: "billing_error_correction",
    label: "Billing-error correction",
    enabled: true,
  },
  subscription_cancellation: {
    key: "subscription_cancellation",
    label: "Subscription cancellation/refund",
    enabled: true,
  },
  insurance_claim: {
    key: "insurance_claim",
    label: "Insurance claim",
    enabled: false,
    reason: "Insurance avenue is deferred (out of scope at MVP).",
  },
  credit_dispute: {
    key: "credit_dispute",
    label: "Credit dispute",
    enabled: false,
    reason: "Credit avenue is deferred (out of scope at MVP).",
  },
  dtc_recovery: {
    key: "dtc_recovery",
    label: "Debt/DTC recovery",
    enabled: false,
    reason: "DTC avenue is deferred (out of scope at MVP).",
  },
  us_recovery: {
    key: "us_recovery",
    label: "US recovery",
    enabled: false,
    reason: "US jurisdiction is deferred (out of scope at MVP).",
  },
});

export const ENABLED_AVENUES: readonly AvenueKey[] = Object.values(AVENUE_REGISTRY)
  .filter((a) => a.enabled)
  .map((a) => a.key);

export type AvenueResolution =
  | { ok: true; avenue: AvenueDef }
  | { ok: false; code: "avenue_disabled" | "avenue_unknown"; reason: string };

export function resolveAvenue(key: string): AvenueResolution {
  const def = (AVENUE_REGISTRY as Record<string, AvenueDef | undefined>)[key];
  if (!def) return { ok: false, code: "avenue_unknown", reason: `Unknown avenue: ${key}` };
  if (!def.enabled) {
    return { ok: false, code: "avenue_disabled", reason: def.reason ?? "Avenue disabled" };
  }
  return { ok: true, avenue: def };
}

export class AvenueDisabledError extends Error {
  readonly code: "avenue_disabled" | "avenue_unknown";
  constructor(code: "avenue_disabled" | "avenue_unknown", reason: string) {
    super(`BLOCKED: ${reason}`);
    this.code = code;
    this.name = "AvenueDisabledError";
  }
}

/** Hard guard at the avenue resolver. Throws for disabled/unknown avenues. */
export function assertAvenueEnabled(key: string): AvenueDef {
  const r = resolveAvenue(key);
  if (!r.ok) throw new AvenueDisabledError(r.code, r.reason);
  return r.avenue;
}
