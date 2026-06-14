// PLAYMONEY_MODE — the one bright line (§6, Rev.3).
//
// BUILT = write/wire/test all code. Always allowed.
// LIVE  = real users, real recoveries, real fees. Physically gated.
//
// Default mode is BUILT. No code path, flag, seed, or test may set LIVE; the
// mode is read from the environment only, and a live action additionally
// requires canGoLive() (all gates green). Live-only paths must be guarded by
// assertLiveAllowed() / isLiveEnabled(), which re-checks BOTH conditions.

import { canGoLive, unmetGates, type GateStatus } from "./gates";

export type PlayMoneyMode = "BUILT" | "LIVE";

/** Reads PLAYMONEY_MODE from env. Anything other than the exact string "LIVE" => BUILT. */
export function getMode(): PlayMoneyMode {
  const raw =
    (typeof process !== "undefined" ? process.env?.PLAYMONEY_MODE : undefined) ?? "BUILT";
  return raw === "LIVE" ? "LIVE" : "BUILT";
}

/**
 * The single predicate guarding every live capability. True ONLY when the
 * environment is explicitly LIVE *and* every go-live gate is green.
 * Default (no env, no attestations) => false.
 */
export function isLiveEnabled(status: Partial<GateStatus> | undefined | null): boolean {
  return getMode() === "LIVE" && canGoLive(status);
}

export class LiveModeBlockedError extends Error {
  constructor(reason: string) {
    super(`BLOCKED: live action not permitted — ${reason}`);
    this.name = "LiveModeBlockedError";
  }
}

/**
 * Hard guard for live-only call sites. Throws unless mode === LIVE AND all gates
 * are green. Call this at the top of any real onboarding / execution / fee
 * capture path. Zero silent failures.
 */
export function assertLiveAllowed(status: Partial<GateStatus> | undefined | null): void {
  if (getMode() !== "LIVE") {
    throw new LiveModeBlockedError(`mode is ${getMode()} (default BUILT); live paths are sealed`);
  }
  if (!canGoLive(status)) {
    throw new LiveModeBlockedError(`unmet go-live gates: ${unmetGates(status).join(", ")}`);
  }
}
