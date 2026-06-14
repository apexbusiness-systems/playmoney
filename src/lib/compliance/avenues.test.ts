import { describe, expect, it } from "vitest";
import {
  resolveAvenue,
  assertAvenueEnabled,
  AvenueDisabledError,
  ENABLED_AVENUES,
} from "./avenues";

describe("T5 · disabled avenues are unreachable, not hidden (#9)", () => {
  it("exactly the 4 administrative avenues are enabled", () => {
    expect([...ENABLED_AVENUES].sort()).toEqual(
      ["billing_error_correction", "fee_reversal", "merchant_refund", "subscription_cancellation"].sort(),
    );
  });

  it("each deferred avenue resolves to avenue_disabled (not enabled)", () => {
    for (const key of ["insurance_claim", "credit_dispute", "dtc_recovery", "us_recovery"]) {
      const r = resolveAvenue(key);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.code).toBe("avenue_disabled");
    }
  });

  it("unknown avenues are rejected", () => {
    const r = resolveAvenue("magic_money");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("avenue_unknown");
  });

  it("assertAvenueEnabled throws for disabled + unknown, returns for enabled", () => {
    expect(() => assertAvenueEnabled("insurance_claim")).toThrow(AvenueDisabledError);
    expect(() => assertAvenueEnabled("nope")).toThrow(AvenueDisabledError);
    expect(assertAvenueEnabled("merchant_refund").enabled).toBe(true);
  });
});
