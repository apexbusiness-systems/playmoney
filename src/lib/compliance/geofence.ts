// M2 · Eligibility / Geofence gate (Control #8) [GATE]
//
// Jurisdiction policy: Alberta (CA/AB) is the controlled pilot launch.
// Quebec has a distinct legal regime and is explicitly blocked.
// U.S. and remaining Canadian provinces are on the waitlist pending legal/compliance gates.
// Enforcement: onboarding cannot complete outside pilot/enabled jurisdictions.
//
// Note: enabling jurisdictions does NOT make the app LIVE — real onboarding
// remains sealed by PLAYMONEY_MODE + canGoLive(). This module only decides
// *which jurisdictions* are permissible once the system does go live.

export type Jurisdiction = { country: string; province: string | null };
export type JurisdictionStatus = "enabled" | "pilot" | "waitlist" | "blocked";

export interface JurisdictionPolicy {
  readonly status: JurisdictionStatus;
  readonly reason: string;
}

/**
 * Per-jurisdiction policy registry. Keys are "CC/PP" for province-level or "CC" for
 * country-level. Province-level takes precedence; country-level applies to unlisted
 * provinces in that country. Jurisdictions absent from this map default to "waitlist".
 */
export const JURISDICTION_POLICIES: Readonly<Record<string, JurisdictionPolicy>> = {
  "CA/AB": {
    status: "pilot",
    reason: "Alberta — controlled pilot launch jurisdiction.",
  },
  "CA/QC": {
    status: "blocked",
    reason: "Quebec is a separate gated project (distinct consumer-law regime); not enabled.",
  },
  US: {
    status: "waitlist",
    reason:
      "United States launch is deferred pending legal and compliance gates. Join the waitlist to be notified.",
  },
};

export type EligibilityResult =
  | { eligible: true; status: "enabled" | "pilot"; jurisdiction: Jurisdiction }
  | {
      eligible: false;
      status: "waitlist" | "blocked";
      code: "jurisdiction_blocked";
      reason: string;
    };

function norm(s: string | null | undefined): string {
  return (s ?? "").trim().toUpperCase();
}

function lookupPolicy(c: string, p: string | null): JurisdictionPolicy | undefined {
  if (p) {
    const provinceKey = `${c}/${p}`;
    if (JURISDICTION_POLICIES[provinceKey]) return JURISDICTION_POLICIES[provinceKey];
  }
  return JURISDICTION_POLICIES[c];
}

export function checkEligibility(country: string, province: string | null): EligibilityResult {
  const c = norm(country);
  const p = norm(province) || null;

  const policy = lookupPolicy(c, p);

  if (!policy) {
    return {
      eligible: false,
      status: "waitlist",
      code: "jurisdiction_blocked",
      reason: `Not yet available in ${[p, c].filter(Boolean).join(", ")}. Join the waitlist to be notified when we expand.`,
    };
  }

  if (policy.status === "enabled" || policy.status === "pilot") {
    return { eligible: true, status: policy.status, jurisdiction: { country: c, province: p } };
  }

  return {
    eligible: false,
    status: policy.status,
    code: "jurisdiction_blocked",
    reason: policy.reason,
  };
}

export class JurisdictionBlockedError extends Error {
  readonly code = "jurisdiction_blocked" as const;
  constructor(reason: string) {
    super(`BLOCKED: ${reason}`);
    this.name = "JurisdictionBlockedError";
  }
}

/** Hard guard for the onboarding entry point. Throws unless jurisdiction is pilot/enabled. */
export function assertEligible(country: string, province: string | null): Jurisdiction {
  const r = checkEligibility(country, province);
  if (!r.eligible) throw new JurisdictionBlockedError(r.reason);
  return r.jurisdiction;
}
