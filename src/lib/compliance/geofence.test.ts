import { describe, expect, it } from "vitest";
import {
  checkEligibility,
  assertEligible,
  JurisdictionBlockedError,
  ENABLED_JURISDICTIONS,
} from "./geofence";

describe("T4 · onboarding rejects non-Alberta; only AB enabled (#8)", () => {
  it("Alberta (CA/AB) is eligible", () => {
    const r = checkEligibility("CA", "AB");
    expect(r.eligible).toBe(true);
  });

  it("is case/whitespace insensitive for Alberta", () => {
    expect(checkEligibility("ca", " ab ").eligible).toBe(true);
  });

  it("blocks every other Canadian province", () => {
    for (const p of ["ON", "BC", "MB", "SK", "NS", "NB"]) {
      expect(checkEligibility("CA", p).eligible).toBe(false);
    }
  });

  it("blocks Quebec with the separate-project reason", () => {
    const r = checkEligibility("CA", "QC");
    expect(r.eligible).toBe(false);
    if (!r.eligible) expect(r.reason).toMatch(/separate gated project/i);
  });

  it("blocks the US (deferred)", () => {
    const r = checkEligibility("US", null);
    expect(r.eligible).toBe(false);
    if (!r.eligible) expect(r.reason).toMatch(/deferred/i);
  });

  it("exactly one jurisdiction is enabled (flags default OFF)", () => {
    expect(ENABLED_JURISDICTIONS).toHaveLength(1);
    expect(ENABLED_JURISDICTIONS[0]).toEqual({ country: "CA", province: "AB" });
  });

  it("assertEligible throws for blocked jurisdictions, returns for AB", () => {
    expect(() => assertEligible("CA", "ON")).toThrow(JurisdictionBlockedError);
    expect(() => assertEligible("US", null)).toThrow(JurisdictionBlockedError);
    expect(assertEligible("CA", "AB")).toEqual({ country: "CA", province: "AB" });
  });
});
