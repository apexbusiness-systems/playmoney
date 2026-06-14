// M2 · Eligibility / Geofence gate (Control #8) [GATE]
//
// Hard signup gate: Alberta only at MVP. Every other province + country flag is
// OFF. Quebec is a SEPARATE gated project (never enabled here). US is deferred.
// Enforcement: onboarding cannot create an account outside the enabled set.
//
// Note: enabling the Alberta geofence does NOT make the app LIVE — real
// onboarding remains sealed by PLAYMONEY_MODE + canGoLive(). This module only
// decides *which jurisdiction* is permissible once the system does go live.

export type Jurisdiction = { country: string; province: string | null };

/** The ONLY enabled jurisdiction at MVP. Everything else is OFF. */
export const ENABLED_JURISDICTIONS: readonly Jurisdiction[] = [
  { country: "CA", province: "AB" },
];

/** Explicitly deferred/blocked, with the reason surfaced for audit + UX. */
export const BLOCKED_JURISDICTIONS: Readonly<Record<string, string>> = {
  "CA/QC": "Quebec is a separate gated project (distinct consumer-law regime); not enabled.",
  US: "United States is deferred; not in scope at MVP.",
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
    return { eligible: false, code: "jurisdiction_blocked", reason: BLOCKED_JURISDICTIONS["CA/QC"] };
  }
  if (c === "US") {
    return { eligible: false, code: "jurisdiction_blocked", reason: BLOCKED_JURISDICTIONS["US"] };
  }

  const match = ENABLED_JURISDICTIONS.some(
    (j) => norm(j.country) === c && norm(j.province) === norm(p),
  );
  if (match) return { eligible: true, jurisdiction: { country: c, province: p } };

  return {
    eligible: false,
    code: "jurisdiction_blocked",
    reason: `Not available in ${[p, c].filter(Boolean).join(", ")}. PlayMoney is Alberta-only at launch.`,
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
