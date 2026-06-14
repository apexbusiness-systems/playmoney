import { afterEach, describe, expect, it } from "vitest";
import { GATE_KEYS, type GateStatus } from "@/lib/compliance/gates";
import { buildHealthReport } from "./health.functions";

const ALL_GREEN: GateStatus = Object.fromEntries(GATE_KEYS.map((k) => [k, true])) as GateStatus;

afterEach(() => {
  delete process.env.PLAYMONEY_MODE;
});

describe("P7 · buildHealthReport: accurate, read-only gate diagnostics", () => {
  it("reports BUILT mode and canGoLive=false with no attestations (default)", () => {
    const report = buildHealthReport({});
    expect(report.mode).toBe("BUILT");
    expect(report.canGoLive).toBe(false);
    expect(report.allGatesGreen).toBe(false);
    expect(report.unmetGates).toHaveLength(GATE_KEYS.length);
    expect(report.gates).toHaveLength(GATE_KEYS.length);
  });

  it("reports BUILT mode even with all gates green (mode seal holds)", () => {
    const report = buildHealthReport(ALL_GREEN);
    expect(report.mode).toBe("BUILT");
    expect(report.canGoLive).toBe(false); // BUILT mode → canGoLive never true
    expect(report.allGatesGreen).toBe(true); // but gates are green
    expect(report.unmetGates).toHaveLength(0);
  });

  it("reports LIVE + canGoLive=true only when PLAYMONEY_MODE=LIVE + all gates green", () => {
    process.env.PLAYMONEY_MODE = "LIVE";
    const report = buildHealthReport(ALL_GREEN);
    expect(report.mode).toBe("LIVE");
    expect(report.canGoLive).toBe(true);
    expect(report.allGatesGreen).toBe(true);
  });

  it("marks the two external gates as external=true (ops/legal only)", () => {
    const report = buildHealthReport({});
    const external = [...report.gates.filter((g) => g.external).map((g) => g.key)].sort();
    expect(external).toEqual(["G-counsel", "G-insurance"].sort());
  });

  it("reports the exact set of unmet gates", () => {
    const partial = { ...ALL_GREEN, "G-counsel": false, "G-fraud": false } as GateStatus;
    const report = buildHealthReport(partial);
    expect([...report.unmetGates].sort()).toEqual(["G-counsel", "G-fraud"].sort());
    expect(report.canGoLive).toBe(false);
  });

  it("includes a checkedAt timestamp", () => {
    const now = new Date("2026-06-14T18:00:00.000Z");
    const report = buildHealthReport({}, now);
    expect(report.checkedAt).toBe("2026-06-14T18:00:00.000Z");
  });
});

describe("P7 · BUILT invariant: no test permanently sets LIVE", () => {
  it("PLAYMONEY_MODE is BUILT by default after test cleanup", () => {
    // Verify afterEach restores the default. If a test leaked LIVE this would fail.
    const report = buildHealthReport({});
    expect(report.mode).toBe("BUILT");
  });
});
