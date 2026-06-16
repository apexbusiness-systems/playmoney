import { describe, expect, it } from "vitest";
import {
  checkEligibility,
  assertEligible,
  JurisdictionBlockedError,
  ENABLED_JURISDICTIONS,
} from "./geofence";

describe("T4 · geofence — Alberta-only launch geofence (#8)", () => {
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

  it("blocks all U.S. states during the Alberta-only launch", () => {
    for (const state of ["TX", "CA", "NY", "FL", "WA", null]) {
      const r = checkEligibility("US", state);
      expect(r.eligible).toBe(false);
      if (!r.eligible) expect(r.reason).toMatch(/United States launch is deferred/i);
    }
  });

  it("US jurisdiction blocking is case-insensitive", () => {
    expect(checkEligibility("us", "tx").eligible).toBe(false);
  });

  it("only one jurisdiction is enabled: CA/AB", () => {
    expect(ENABLED_JURISDICTIONS).toEqual([{ country: "CA", province: "AB" }]);
  });

  it("assertEligible throws for blocked jurisdictions, passes only for AB", () => {
    expect(() => assertEligible("CA", "ON")).toThrow(JurisdictionBlockedError);
    expect(() => assertEligible("CA", "QC")).toThrow(JurisdictionBlockedError);
    expect(() => assertEligible("US", "TX")).toThrow(JurisdictionBlockedError);
    expect(() => assertEligible("US", null)).toThrow(JurisdictionBlockedError);
    expect(assertEligible("CA", "AB")).toEqual({ country: "CA", province: "AB" });
  });
});
