// P7 · Go-live health check server fn.
//
// Reports the truthful status of every go-live gate, the current PLAYMONEY_MODE,
// and whether canGoLive() is true. Used by ops to verify pre-launch readiness.
// This is a READ-ONLY diagnostic — it never sets gates or changes any state.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { GATE_KEYS, canGoLive, unmetGates, type GateKey } from "@/lib/compliance/gates";
import { getMode, isLiveEnabled } from "@/lib/compliance/mode";

export interface GateReport {
  key: GateKey;
  green: boolean;
  external: boolean; // ops/legal only — code may never auto-set
}

export interface HealthReport {
  mode: "BUILT" | "LIVE";
  canGoLive: boolean;
  allGatesGreen: boolean;
  unmetGates: readonly GateKey[];
  gates: readonly GateReport[];
  checkedAt: string;
}

const EXTERNAL_GATE_KEYS: readonly GateKey[] = ["G-counsel", "G-insurance"];

/**
 * Pure health report builder (testable without I/O).
 * Accepts gate status as a parameter so it can be tested with any config.
 */
export function buildHealthReport(
  gateStatus: Partial<Record<GateKey, boolean>>,
  now: Date = new Date(),
): HealthReport {
  const mode = getMode();
  const gates: GateReport[] = GATE_KEYS.map((key) => ({
    key,
    green: gateStatus[key] === true,
    external: (EXTERNAL_GATE_KEYS as readonly string[]).includes(key),
  }));
  const unmet = unmetGates(gateStatus);
  return {
    mode,
    canGoLive: isLiveEnabled(gateStatus), // true only when mode=LIVE AND all gates green
    allGatesGreen: canGoLive(gateStatus), // pure gate check regardless of mode
    unmetGates: unmet,
    gates,
    checkedAt: now.toISOString(),
  };
}

/** TanStack Start server fn — returns the live gate health report. */
export const goLiveHealthCheckFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({}))
  .handler(async (): Promise<HealthReport> => {
    const { loadGateStatus } = await import("@/lib/compliance/gates.server");
    const gateStatus = await loadGateStatus();
    return buildHealthReport(gateStatus);
  });
