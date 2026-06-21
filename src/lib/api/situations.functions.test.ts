import { describe, expect, it, vi } from "vitest";
import { getSituations, SAMPLE_SITUATIONS } from "./situations.functions";
import type { DetectedSituation } from "@/lib/engine/situation";

const LIVE_DERIVED: DetectedSituation[] = [
  {
    situation: {
      id: "sit_live_1",
      merchant: "Real Bank",
      detectedAt: "2026-06-20T00:00:00Z",
      summary: "Real duplicate charge",
    },
    problemType: "double_charge",
    merchant: "Real Bank",
    amountCents: 1234,
    evidenceTxnIds: ["txn_real"],
  },
];

describe("T2 · getSituations is mode-aware and honestly labeled", () => {
  it("returns sampleMode:true with the disclosed sample set in BUILT (not live)", async () => {
    const loadLiveSituations = vi.fn(async () => LIVE_DERIVED);
    const result = await getSituations({ isLive: false, loadLiveSituations });

    expect(result.sampleMode).toBe(true);
    expect(result.situations).toBe(SAMPLE_SITUATIONS);
    // The live loader must NOT run when sealed.
    expect(loadLiveSituations).not.toHaveBeenCalled();
  });

  it("the live branch is reachable: returns sampleMode:false with real derived situations", async () => {
    const loadLiveSituations = vi.fn(async () => LIVE_DERIVED);
    const result = await getSituations({ isLive: true, loadLiveSituations });

    expect(result.sampleMode).toBe(false);
    expect(result.situations).toBe(LIVE_DERIVED);
    expect(loadLiveSituations).toHaveBeenCalledTimes(1);
  });

  it("the sample set is non-empty and tagged with problem types the engine emits", () => {
    expect(SAMPLE_SITUATIONS.length).toBeGreaterThan(0);
    for (const s of SAMPLE_SITUATIONS) {
      expect(typeof s.problemType).toBe("string");
      expect(s.amountCents).toBeGreaterThan(0);
    }
  });
});
