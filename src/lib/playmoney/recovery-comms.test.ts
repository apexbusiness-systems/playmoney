import { describe, it, expect } from "vitest";
import { buildRecoveryCommPackage, UnsupportedAvenueError, type RcpInput } from "./recovery-comms";
import { lintCopy } from "@/lib/compliance/upl";

const baseInput: RcpInput = {
  avenue: "merchant_refund",
  merchant: "ACME Corp",
  contact: { method: "directory", url: "https://acme.com/disputes" },
  userDisplayName: "Jane Smith",
  amountCents: 4999,
  recoveryId: "rec_test_001",
  reason: "Service was not delivered as described.",
  now: new Date("2026-06-21T00:00:00Z"),
};

describe("buildRecoveryCommPackage", () => {
  describe("merchant_refund", () => {
    it("builds a well-formed package", () => {
      const pkg = buildRecoveryCommPackage(baseInput);
      expect(pkg.avenue).toBe("merchant_refund");
      expect(pkg.recoveryId).toBe("rec_test_001");
      expect(pkg.subject).toContain("ACME Corp");
      expect(pkg.subject).toContain("$49.99 CAD");
      expect(pkg.body).toContain("Jane Smith");
      expect(pkg.body).toContain("rec_test_001");
      expect(pkg.body).toContain("$49.99 CAD");
      expect(pkg.body).toContain("Service was not delivered as described.");
    });

    it("passes UPL linter", () => {
      const pkg = buildRecoveryCommPackage(baseInput);
      expect(lintCopy(pkg.body).clean).toBe(true);
    });

    it("includes Consumer Protection Act citation", () => {
      const pkg = buildRecoveryCommPackage(baseInput);
      expect(pkg.citations.some((c) => c.includes("Consumer Protection Act"))).toBe(true);
    });
  });

  describe("fee_reversal", () => {
    const input: RcpInput = { ...baseInput, avenue: "fee_reversal" };

    it("builds and passes UPL linter", () => {
      const pkg = buildRecoveryCommPackage(input);
      expect(pkg.avenue).toBe("fee_reversal");
      expect(lintCopy(pkg.body).clean).toBe(true);
    });

    it("cites FCAC and CBA", () => {
      const pkg = buildRecoveryCommPackage(input);
      expect(pkg.citations.some((c) => c.includes("FCAC"))).toBe(true);
      expect(pkg.citations.some((c) => c.includes("CBA"))).toBe(true);
    });
  });

  describe("billing_error_correction", () => {
    const input: RcpInput = { ...baseInput, avenue: "billing_error_correction" };

    it("builds and passes UPL linter", () => {
      const pkg = buildRecoveryCommPackage(input);
      expect(pkg.avenue).toBe("billing_error_correction");
      expect(lintCopy(pkg.body).clean).toBe(true);
    });

    it("cites CRTC, OEB, and Consumer Protection Act", () => {
      const pkg = buildRecoveryCommPackage(input);
      expect(pkg.citations.some((c) => c.includes("CRTC"))).toBe(true);
      expect(pkg.citations.some((c) => c.includes("OEB"))).toBe(true);
      expect(pkg.citations.some((c) => c.includes("Consumer Protection Act"))).toBe(true);
    });
  });

  describe("subscription_cancellation", () => {
    const input: RcpInput = { ...baseInput, avenue: "subscription_cancellation" };

    it("builds and passes UPL linter", () => {
      const pkg = buildRecoveryCommPackage(input);
      expect(pkg.avenue).toBe("subscription_cancellation");
      expect(lintCopy(pkg.body).clean).toBe(true);
    });

    it("cites CPA s.25 recurring charges provision", () => {
      const pkg = buildRecoveryCommPackage(input);
      expect(pkg.citations.some((c) => c.includes("s. 25"))).toBe(true);
    });
  });

  it("formats amount correctly in body", () => {
    const pkg = buildRecoveryCommPackage({ ...baseInput, amountCents: 10000 });
    expect(pkg.body).toContain("$100.00 CAD");
  });

  it("includes generatedAt timestamp", () => {
    const pkg = buildRecoveryCommPackage(baseInput);
    expect(pkg.generatedAt).toBe("2026-06-21T00:00:00.000Z");
  });

  it("throws UnsupportedAvenueError for disabled avenues", () => {
    expect(() =>
      buildRecoveryCommPackage({
        ...baseInput,
        avenue: "insurance_claim" as Parameters<typeof buildRecoveryCommPackage>[0]["avenue"],
      }),
    ).toThrow(UnsupportedAvenueError);
  });
});
