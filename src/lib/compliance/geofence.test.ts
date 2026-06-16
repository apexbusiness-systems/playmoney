import { describe, expect, it } from "vitest";
import {
  checkEligibility,
  assertEligible,
  JurisdictionBlockedError,
  ENABLED_JURISDICTIONS,
} from "./geofence";

describe("T4 · geofence — CA/AB + all US states enabled (#8)", () => {
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

  it("US with any state is eligible", () => {
    for (const state of ["TX", "CA", "NY", "FL", "WA", null]) {
      expect(checkEligibility("US", state).eligible).toBe(true);
    }
  });

  it("US jurisdiction is case-insensitive", () => {
    expect(checkEligibility("us", "tx").eligible).toBe(true);
  });

  it("two jurisdictions are enabled: CA/AB and US (any state)", () => {
    expect(ENABLED_JURISDICTIONS).toHaveLength(2);
    expect(ENABLED_JURISDICTIONS[0]).toEqual({ country: "CA", province: "AB" });
    expect(ENABLED_JURISDICTIONS[1]).toEqual({ country: "US", province: null });
  });

  it("assertEligible throws for blocked jurisdictions, passes for AB and US", () => {
    expect(() => assertEligible("CA", "ON")).toThrow(JurisdictionBlockedError);
    expect(() => assertEligible("CA", "QC")).toThrow(JurisdictionBlockedError);
    expect(assertEligible("CA", "AB")).toEqual({ country: "CA", province: "AB" });
    expect(assertEligible("US", "TX")).toEqual({ country: "US", province: "TX" });
    expect(assertEligible("US", null)).toEqual({ country: "US", province: null });
  });
});
