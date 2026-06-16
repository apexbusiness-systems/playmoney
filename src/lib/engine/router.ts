// P3 · AvenueRouter — map a problem-type (or a derived situation) onto an ENABLED
// administrative avenue (#9). The avenue registry (compliance/avenues.ts) is the
// authoritative gate: a problem that maps to a disabled/deferred avenue returns a
// typed `avenue_disabled` result and NEVER an avenue the system can act on.
//
// PURE: no I/O. The default mapping is exhaustive over ProblemType and only ever
// targets the four enabled avenues, so routeProblem() can never return a disabled
// avenue under the default mapping (proven in router.test.ts).

import { resolveAvenue, type AvenueDef, type AvenueKey } from "@/lib/compliance/avenues";
import type { ProblemType } from "./situation";
import type { DetectedSituation } from "./situation";

/** Default problem-type → administrative-avenue mapping (all targets enabled). */
export const PROBLEM_TYPE_TO_AVENUE: Readonly<Record<ProblemType, AvenueKey>> = Object.freeze({
  refund: "merchant_refund",
  fee_reversal: "fee_reversal",
  subscription: "subscription_cancellation",
  billing_error: "billing_error_correction",
  double_charge: "billing_error_correction",
});

export type RouteResult =
  | { ok: true; problemType: ProblemType; avenue: AvenueDef }
  | {
      ok: false;
      problemType: ProblemType;
      code: "avenue_disabled" | "avenue_unknown";
      reason: string;
    };

/**
 * Route a problem-type to an enabled avenue. The mapping is injectable so callers
 * (and tests) can prove the disabled-avenue guard: any mapping that targets a
 * deferred avenue (insurance/credit/DTC/US) yields `avenue_disabled`, never a hit.
 */
export function routeProblem(
  problemType: ProblemType,
  mapping: Readonly<Record<ProblemType, AvenueKey>> = PROBLEM_TYPE_TO_AVENUE,
): RouteResult {
  const key = mapping[problemType];
  const resolved = resolveAvenue(key);
  if (!resolved.ok) {
    return { ok: false, problemType, code: resolved.code, reason: resolved.reason };
  }
  return { ok: true, problemType, avenue: resolved.avenue };
}

/** Route a derived situation (convenience over its problemType). */
export function routeSituation(
  situation: DetectedSituation,
  mapping: Readonly<Record<ProblemType, AvenueKey>> = PROBLEM_TYPE_TO_AVENUE,
): RouteResult {
  return routeProblem(situation.problemType, mapping);
}
