import { describe, expect, it } from "vitest";
import { lintCopy, assertCleanCopy, UplViolationError } from "./upl";

describe("T6 · UPL linter blocks legal-advice / demand / litigation copy (#10)", () => {
  it("passes ordinary administrative refund-request copy", () => {
    const ok =
      "Hello, I'm writing on behalf of a customer to request a refund for a duplicate charge on June 2. Please process the refund to the original payment method. Thank you.";
    expect(lintCopy(ok).clean).toBe(true);
    expect(assertCleanCopy(ok)).toBe(ok);
  });

  it("blocks legal-advice language", () => {
    const r = lintCopy("Based on our legal opinion, you have a strong legal claim here.");
    expect(r.clean).toBe(false);
    expect(r.violations.map((v) => v.rule)).toContain("legal_advice");
  });

  it("blocks demand-letter language", () => {
    const r = lintCopy("This is a formal demand letter; failure to comply will result in penalties.");
    expect(r.clean).toBe(false);
    expect(r.violations.map((v) => v.rule)).toContain("demand_letter");
  });

  it("blocks litigation threats", () => {
    const r = lintCopy("Refund us now or we will sue you and take you to court.");
    expect(r.clean).toBe(false);
    expect(r.violations.map((v) => v.rule)).toContain("litigation_threat");
  });

  it("blocks offers of court/tribunal representation", () => {
    const r = lintCopy("Our team can represent you before the tribunal and appear in court on your behalf.");
    expect(r.clean).toBe(false);
    expect(r.violations.map((v) => v.rule)).toContain("court_representation");
  });

  it("assertCleanCopy throws a typed violation with the matched rule", () => {
    expect(() => assertCleanCopy("We hereby demand immediate payment.")).toThrow(UplViolationError);
    try {
      assertCleanCopy("cease and desist immediately");
    } catch (e) {
      expect(e).toBeInstanceOf(UplViolationError);
      expect((e as UplViolationError).violations[0].rule).toBe("demand_letter");
    }
  });
});
