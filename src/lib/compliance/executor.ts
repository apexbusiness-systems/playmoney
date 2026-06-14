// MAN Mode Executor (Control #7) [GATE] — the single execute path.
//
// No action runs without (a) a valid, unexpired, unrevoked, in-scope e-LOA token
// (#6), and (b) a human-approved review-queue item (#14). Even then, the REAL
// outbound effect only fires when the app is LIVE and every go-live gate is green
// (§6); in BUILT mode the action is fully validated but sealed (no real send).
// Zero silent failures — every branch returns a typed Result.

import { verifyLoa, type ExecuteAction, type LoaToken } from "./loa";
import { isApprovedForSend, type ReviewItem } from "./review";
import { isLiveEnabled } from "./mode";
import type { GateStatus } from "./gates";

export type ExecOutcome<T> =
  | { status: "rejected"; code: ExecRejectCode; reason: string }
  | { status: "sealed"; reason: string } // authorized + reviewed, but app not LIVE
  | { status: "executed"; result: T };

export type ExecRejectCode = "loa_invalid" | "review_not_approved";

/**
 * The MAN-Mode gate. `perform` (the real outbound effect) is invoked ONLY after
 * both authorization checks pass AND the app is live with all gates green.
 */
export async function executeRecoveryAction<T>(input: {
  action: ExecuteAction;
  loaToken: LoaToken | null | undefined;
  reviewItem: ReviewItem | null | undefined;
  gateStatus: Partial<GateStatus> | null | undefined;
  perform: () => Promise<T>;
  now?: Date;
}): Promise<ExecOutcome<T>> {
  // 1. e-LOA must authorize this exact action (#6/#7).
  const loa = verifyLoa(input.loaToken, input.action, input.now);
  if (!loa.valid) {
    return { status: "rejected", code: "loa_invalid", reason: `LOA: ${loa.reason}` };
  }

  // 2. The action must come from a human-approved review item (#14).
  if (!isApprovedForSend(input.reviewItem)) {
    return {
      status: "rejected",
      code: "review_not_approved",
      reason: "Action has not passed human-review-before-send",
    };
  }

  // 3. Real execution is sealed unless the app is LIVE and every gate is green (§6).
  if (!isLiveEnabled(input.gateStatus)) {
    return {
      status: "sealed",
      reason: "Authorized + reviewed, but app is BUILT / gates unmet — no real action taken",
    };
  }

  return { status: "executed", result: await input.perform() };
}
