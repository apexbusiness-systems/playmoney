import { describe, expect, it } from "vitest";
import {
  validateInternetSalesAgreement,
  recordAcceptance,
  buildPadConsent,
  cancelPadConsent,
  MIN_PAD_ADVANCE_NOTICE_DAYS,
} from "./contract";

const tos = {
  type: "tos" as const,
  version: "1.0.0",
  title: "PlayMoney Terms",
  totalCostDisclosure: "25% of confirmed recoveries; no win, no fee.",
  feeBasis: "Percentage of confirmed recovery amount.",
  cancellationRights: "Cancel anytime; no fee on uncaused recoveries.",
  deliveredCopyRef: "agreements/tos/1.0.0.pdf",
  contentHash: "sha256:abc",
};

describe("M3 · CPA internet-sales ToS + PAD consent (#11, #12)", () => {
  it("accepts a ToS with all CPA C-26.3 required disclosures", () => {
    expect(validateInternetSalesAgreement(tos).version).toBe("1.0.0");
  });

  it("rejects a ToS missing required disclosures", () => {
    for (const k of ["totalCostDisclosure", "feeBasis", "cancellationRights", "deliveredCopyRef"]) {
      expect(() => validateInternetSalesAgreement({ ...tos, [k]: "" })).toThrow();
    }
  });

  it("records an immutable acceptance", () => {
    const a = recordAcceptance({
      ownerId: "u1",
      agreementType: "tos",
      agreementVersion: "1.0.0",
      contentHash: "sha256:abc",
      now: new Date("2026-06-14T12:00:00Z"),
    });
    expect(a.acceptedAt).toBe("2026-06-14T12:00:00.000Z");
  });

  it("builds a Rule H1 PAD consent with sufficient advance notice", () => {
    const c = buildPadConsent({
      ownerId: "u1",
      method: "pad",
      amountBasis: "Fee equal to 25% of each confirmed recovery, notified before charge.",
      advanceNoticeDays: MIN_PAD_ADVANCE_NOTICE_DAYS,
      cancellationPath: "Cancel in Settings or email support; recourse per Rule H1.",
    });
    expect(c.status).toBe("active");
  });

  it("rejects a PAD consent with too little advance notice (unless waived)", () => {
    const base = {
      ownerId: "u1",
      method: "pad" as const,
      amountBasis: "x",
      advanceNoticeDays: 2,
      cancellationPath: "Cancel anytime.",
    };
    expect(() => buildPadConsent(base)).toThrow(/advance notice/i);
    expect(buildPadConsent({ ...base, waiveAdvanceNotice: true }).status).toBe("active");
  });

  it("rejects any consent without a cancellation/recourse path", () => {
    expect(() =>
      buildPadConsent({
        ownerId: "u1",
        method: "card_on_file",
        amountBasis: "x",
        advanceNoticeDays: 0,
        cancellationPath: "   ",
      }),
    ).toThrow(/cancellation/i);
  });

  it("cancels a consent (recourse path)", () => {
    const c = buildPadConsent({
      ownerId: "u1",
      method: "card_on_file",
      amountBasis: "x",
      advanceNoticeDays: 0,
      cancellationPath: "Cancel anytime.",
    });
    const cancelled = cancelPadConsent(c, new Date("2026-06-15T00:00:00Z"));
    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.cancelledAt).toBe("2026-06-15T00:00:00.000Z");
  });
});
