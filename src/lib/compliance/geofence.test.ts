import { describe, expect, it } from "vitest";
import {
  checkEligibility,
  assertEligible,
  JurisdictionBlockedError,
  JURISDICTION_POLICIES,
} from "./geofence";

describe("T4 · geofence — jurisdiction policy model (#8)", () => {
  it("Alberta (CA/AB) is pilot-eligible", () => {
    const r = checkEligibility("CA", "AB");
    expect(r.eligible).toBe(true);
    if (r.eligible) expect(r.status).toBe("pilot");
  });

  it("is case/whitespace insensitive for Alberta", () => {
    const r = checkEligibility("ca", " ab ");
    expect(r.eligible).toBe(true);
  });

  it("CA/AB policy is explicitly registered as pilot", () => {
    expect(JURISDICTION_POLICIES["CA/AB"]?.status).toBe("pilot");
  });

  it("blocks Quebec (blocked status) with the separate-project reason", () => {
    const r = checkEligibility("CA", "QC");
    expect(r.eligible).toBe(false);
    if (!r.eligible) {
      expect(r.status).toBe("blocked");
      expect(r.reason).toMatch(/separate gated project/i);
    }
  });

  it("CA/QC policy is explicitly registered as blocked", () => {
    expect(JURISDICTION_POLICIES["CA/QC"]?.status).toBe("blocked");
  });

  it("other Canadian provinces return waitlist (not blocked, not eligible)", () => {
    for (const p of ["ON", "BC", "MB", "SK", "NS", "NB"]) {
      const r = checkEligibility("CA", p);
      expect(r.eligible).toBe(false);
      if (!r.eligible) expect(r.status).toBe("waitlist");
    }
  });

  it("U.S. jurisdictions return waitlist (deferred, not hard-blocked)", () => {
    for (const state of ["TX", "CA", "NY", "FL", "WA", null]) {
      const r = checkEligibility("US", state);
      expect(r.eligible).toBe(false);
      if (!r.eligible) {
        expect(r.status).toBe("waitlist");
        expect(r.reason).toMatch(/deferred/i);
      }
    }
  });

  it("US jurisdiction check is case-insensitive and returns waitlist", () => {
    const r = checkEligibility("us", "tx");
    expect(r.eligible).toBe(false);
    if (!r.eligible) expect(r.status).toBe("waitlist");
  });

  it("US country-level policy is waitlist", () => {
    expect(JURISDICTION_POLICIES["US"]?.status).toBe("waitlist");
  });

  it("assertEligible passes only for pilot/enabled jurisdictions (CA/AB)", () => {
    expect(assertEligible("CA", "AB")).toEqual({ country: "CA", province: "AB" });
  });

  it("assertEligible throws JurisdictionBlockedError for blocked jurisdictions (CA/QC)", () => {
    expect(() => assertEligible("CA", "QC")).toThrow(JurisdictionBlockedError);
  });

  it("assertEligible throws for waitlisted jurisdictions (CA/ON, US states)", () => {
    expect(() => assertEligible("CA", "ON")).toThrow(JurisdictionBlockedError);
    expect(() => assertEligible("US", "TX")).toThrow(JurisdictionBlockedError);
    expect(() => assertEligible("US", null)).toThrow(JurisdictionBlockedError);
  });
});
