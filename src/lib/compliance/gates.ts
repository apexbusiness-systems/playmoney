// Go-Live Gate predicates (§6, Rev.3). Build the switch; leave it OFF.
//
// canGoLive() is a PURE function over a gate-status map so it is trivially
// testable (T10). The DB-backed loader lives in gates.server.ts. Default state
// (no attestations) => every gate false => canGoLive() === false.
//
// G-counsel and G-insurance are ops/legal facts: code NEVER auto-sets them.
// We only build the check + the attestation/audit plumbing.

export const GATE_KEYS = [
  "G-counsel", // external Alberta fintech counsel counter-signed        [external]
  "G-noncustody", // non-custodial flow verified end-to-end                [test]
  "G-loa", // e-LOA live, gating every execute action                      [test]
  "G-geofence", // Alberta ON; other provinces + US OFF                    [config+test]
  "G-avenues", // only 4 administrative avenues; ins/credit/DTC hard-OFF   [config+test]
  "G-contract", // CPA internet-sales ToS + Privacy Policy; consent capt.  [data+test]
  "G-pad", // PAD/card consent (Rule H1) w/ advance notice + cancellation  [test]
  "G-causation", // fee-causation rule + DIY-free disclosure live          [test]
  "G-fraud", // fraud/chargeback controls + human-review-before-send       [test]
  "G-insurance", // E&O + cyber bound (no AI exclusion); APEX Ltd. party   [external]
] as const;

export type GateKey = (typeof GATE_KEYS)[number];

/** Gate keys that are ops/legal facts — code may never self-satisfy these. */
export const EXTERNAL_GATE_KEYS: readonly GateKey[] = ["G-counsel", "G-insurance"];

export type GateStatus = Readonly<Record<GateKey, boolean>>;

/** All gates false — the default, used when nothing has been attested. */
export const EMPTY_GATE_STATUS: GateStatus = Object.freeze(
  Object.fromEntries(GATE_KEYS.map((k) => [k, false])) as Record<GateKey, boolean>,
);

/**
 * PURE go-live predicate: true ONLY when every required gate is green.
 * Any missing or false gate => false. Never throws.
 */
export function canGoLive(status: Partial<GateStatus> | undefined | null): boolean {
  if (!status) return false;
  return GATE_KEYS.every((k) => status[k] === true);
}

/** Gates that are still red, for diagnostics / audit. */
export function unmetGates(status: Partial<GateStatus> | undefined | null): GateKey[] {
  return GATE_KEYS.filter((k) => !status || status[k] !== true);
}
