// M2 · Eligibility / Geofence gate (Control #8) [GATE]
//
// Enabled jurisdictions: Alberta (CA/AB) + all US states.
// Quebec is a SEPARATE gated project (distinct consumer-law regime).
// All other Canadian provinces are OFF until individually gated.
// Enforcement: onboarding cannot create an account outside the enabled set.
//
// Note: enabling jurisdictions does NOT make the app LIVE — real onboarding
// remains sealed by PLAYMONEY_MODE + canGoLive(). This module only decides
// *which jurisdictions* are permissible once the system does go live.

export type Jurisdiction = { country: string; province: string | null };

/**
 * Enabled jurisdictions. A null province means "any province/state" for that
 * country — used for the US where all states are equally in scope.
 */
export const ENABLED_JURISDICTIONS: readonly Jurisdiction[] = [
  { country: "CA", province: "AB" }, // Canada: Alberta only
  { country: "US", province: null }, // United States: all states
];

/** Explicitly deferred/blocked, with the reason surfaced for audit + UX. */
export const BLOCKED_JURISDICTIONS: Readonly<Record<string, string>> = {
  "CA/QC": "Quebec is a separate gated project (distinct consumer-law regime); not enabled.",
};

export type EligibilityResult =
  | { eligible: true; jurisdiction: Jurisdiction }
  | { eligible: false; code: "jurisdiction_blocked"; reason: string };

function norm(s: string | null | undefined): string {
  return (s ?? "").trim().toUpperCase();
}

export function checkEligibility(country: string, province: string | null): EligibilityResult {
  const c = norm(country);
  const p = norm(province) || null;

  // Explicit blocks first, so the reason is precise.
  if (c === "CA" && p === "QC") {
    return {
      eligible: false,
      code: "jurisdiction_blocked",
      reason: BLOCKED_JURISDICTIONS["CA/QC"],
    };
  }

  // A null province in ENABLED_JURISDICTIONS means "any province/state".
  const match = ENABLED_JURISDICTIONS.some(
    (j) => norm(j.country) === c && (j.province === null || norm(j.province) === norm(p)),
  );
  if (match) return { eligible: true, jurisdiction: { country: c, province: p } };

  return {
    eligible: false,
    code: "jurisdiction_blocked",
    reason: `Not available in ${[p, c].filter(Boolean).join(", ")} yet. Supported: Alberta (CA) and all US states.`,
  };
}

export class JurisdictionBlockedError extends Error {
  readonly code = "jurisdiction_blocked" as const;
  constructor(reason: string) {
    super(`BLOCKED: ${reason}`);
    this.name = "JurisdictionBlockedError";
  }
}

/** Hard guard for the onboarding entry point. Throws unless jurisdiction enabled. */
export function assertEligible(country: string, province: string | null): Jurisdiction {
  const r = checkEligibility(country, province);
  if (!r.eligible) throw new JurisdictionBlockedError(r.reason);
  return r.jurisdiction;
}
