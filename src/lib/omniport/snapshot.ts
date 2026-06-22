// OmniPort platform snapshot builder — pure, no I/O. All inputs (mode, flag count,
// timing) are injected so the builder is fully deterministic and unit-testable.

import type { OmniSnapshot } from "./types";

export interface SnapshotInput {
  mode: string;
  omniportEnabled: boolean;
  featureFlagCount: number;
  /** Module-load timestamp of the worker isolate (ms epoch). */
  processStartMs: number;
  /** "now" (ms epoch), injected so the builder stays pure. */
  now: number;
}

/** Build a read-only OmniSnapshot from injected platform state. */
export function buildSnapshot(input: SnapshotInput): OmniSnapshot {
  const uptime = input.now - input.processStartMs;
  return {
    mode: input.mode,
    omniportEnabled: input.omniportEnabled,
    featureFlagCount: Math.max(0, Math.trunc(input.featureFlagCount)),
    workerUptimeMs: uptime > 0 ? Math.trunc(uptime) : 0,
    checkedAt: new Date(input.now).toISOString(),
  };
}
