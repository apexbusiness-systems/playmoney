import { describe, expect, it } from "vitest";
import { decideFee, computeFee, validateFeeRate, FEE_RATE, DIY_FREE_DISCLOSURE } from "./causation";

const confirmed = {
  recoveryId: "rec_0001",
  grossAmountCents: 10000,
  confirmedAt: "2026-06-14T12:00:00Z",
  evidenceRef: "evidence/rec_0001.pdf",
};

describe("T2 · fee impossible without confirmed recovery + causation + disclosure (#13)", () => {
  it("allows a fee only when all three conditions hold", () => {
    const d = decideFee({ recovery: confirmed, causedByPlaymoney: true, disclosureAcked: true });
    expect(d.allowed).toBe(true);
    if (d.allowed) expect(d.feeCents).toBe(2500); // 25% of $100
  });

  it("blocks when the recovery is not confirmed", () => {
    const d = decideFee({
      recovery: { recoveryId: "x" },
      causedByPlaymoney: true,
      disclosureAcked: true,
    });
    expect(d.allowed).toBe(false);
    if (!d.allowed) expect(d.code).toBe("not_confirmed_recovery");
  });

  it("blocks when not caused by PlayMoney", () => {
    const d = decideFee({ recovery: confirmed, causedByPlaymoney: false, disclosureAcked: true });
    expect(d.allowed).toBe(false);
    if (!d.allowed) expect(d.code).toBe("not_caused_by_playmoney");
  });

  it("blocks when the DIY disclosure was not acknowledged", () => {
    const d = decideFee({ recovery: confirmed, causedByPlaymoney: true, disclosureAcked: false });
    expect(d.allowed).toBe(false);
    if (!d.allowed) expect(d.code).toBe("disclosure_not_acked");
  });

  it("enforces the 20-30% benchmark band", () => {
    expect(validateFeeRate(0.2)).toBe(0.2);
    expect(validateFeeRate(0.3)).toBe(0.3);
    expect(() => validateFeeRate(0.19)).toThrow();
    expect(() => validateFeeRate(0.31)).toThrow();
    expect(FEE_RATE.default).toBe(0.25);
  });

  it("computes fees by rounding cents", () => {
    expect(computeFee(10000, 0.25)).toBe(2500);
    expect(computeFee(8393, 0.2)).toBe(1679); // round(1678.6)
  });

  it("exposes the do-it-yourself-free disclosure copy", () => {
    expect(DIY_FREE_DISCLOSURE).toMatch(/yourself for free/i);
  });
});
