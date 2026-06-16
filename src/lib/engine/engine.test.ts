import { describe, expect, it } from "vitest";
import type { BankTransaction } from "@/lib/compliance/ports";
import { RecoveryAvenue, type OccupationContext } from "@/lib/playmoney/types";
import { AVENUE_REGISTRY, ENABLED_AVENUES, type AvenueKey } from "@/lib/compliance/avenues";
import { deriveSituations, rankByContext, type ProblemType } from "./situation";
import { PROBLEM_TYPE_TO_AVENUE, routeProblem, routeSituation } from "./router";
import { InMemoryWinRateStore, LearningLoop } from "./learning";

const tx = (
  over: Partial<BankTransaction> & Pick<BankTransaction, "id" | "postedAt" | "amountCents">,
): BankTransaction => ({
  merchant: "Acme",
  description: "",
  ...over,
});

describe("P3 · SituationModel: pure, deterministic detection", () => {
  it("detects a duplicate (double) charge from two equal same-window txns", () => {
    const txns: BankTransaction[] = [
      tx({
        id: "t1",
        merchant: "Uber",
        amountCents: 5140,
        postedAt: "2026-06-10T10:00:00.000Z",
        description: "Ride",
      }),
      tx({
        id: "t2",
        merchant: "Uber",
        amountCents: 5140,
        postedAt: "2026-06-10T10:05:00.000Z",
        description: "Ride",
      }),
    ];
    const sits = deriveSituations(txns);
    expect(sits).toHaveLength(1);
    expect(sits[0].problemType).toBe<ProblemType>("double_charge");
    expect(sits[0].evidenceTxnIds).toEqual(["t1", "t2"]);
    expect(sits[0].amountCents).toBe(5140);
  });

  it("detects a reversible fee by keyword → fee_reversal", () => {
    const sits = deriveSituations([
      tx({
        id: "f1",
        merchant: "Chase",
        amountCents: 3500,
        postedAt: "2026-06-01T00:00:00.000Z",
        description: "Overdraft fee",
      }),
    ]);
    expect(sits.map((s) => s.problemType)).toEqual<ProblemType[]>(["fee_reversal"]);
  });

  it("detects a recurring subscription from 3+ equal charges", () => {
    const sits = deriveSituations([
      tx({
        id: "s1",
        merchant: "Spotify",
        amountCents: 1199,
        postedAt: "2026-03-01T00:00:00.000Z",
        description: "Premium",
      }),
      tx({
        id: "s2",
        merchant: "Spotify",
        amountCents: 1199,
        postedAt: "2026-04-01T00:00:00.000Z",
        description: "Premium",
      }),
      tx({
        id: "s3",
        merchant: "Spotify",
        amountCents: 1199,
        postedAt: "2026-05-01T00:00:00.000Z",
        description: "Premium",
      }),
    ]);
    expect(sits).toHaveLength(1);
    expect(sits[0].problemType).toBe<ProblemType>("subscription");
    expect(sits[0].evidenceTxnIds).toHaveLength(3);
  });

  it("is deterministic and consumes each txn at most once", () => {
    const txns: BankTransaction[] = [
      tx({
        id: "d1",
        merchant: "Uber",
        amountCents: 5140,
        postedAt: "2026-06-10T10:00:00.000Z",
        description: "Ride",
      }),
      tx({
        id: "d2",
        merchant: "Uber",
        amountCents: 5140,
        postedAt: "2026-06-10T10:05:00.000Z",
        description: "Ride",
      }),
      tx({
        id: "x1",
        merchant: "Chase",
        amountCents: 3500,
        postedAt: "2026-06-01T00:00:00.000Z",
        description: "NSF fee",
      }),
    ];
    const a = deriveSituations(txns);
    const b = deriveSituations(txns);
    expect(a).toEqual(b);
    const allEvidence = a.flatMap((s) => s.evidenceTxnIds);
    expect(new Set(allEvidence).size).toBe(allEvidence.length); // no txn double-counted
  });

  it("returns nothing for an unremarkable single charge", () => {
    expect(
      deriveSituations([
        tx({
          id: "n1",
          merchant: "Grocer",
          amountCents: 4210,
          postedAt: "2026-06-01T00:00:00.000Z",
          description: "Groceries",
        }),
      ]),
    ).toEqual([]);
  });
});

describe("P3 · AvenueRouter: never routes to a disabled avenue", () => {
  it("default mapping is exhaustive over ProblemType and targets only enabled avenues", () => {
    for (const problemType of RecoveryAvenue.options as readonly ProblemType[]) {
      const target = PROBLEM_TYPE_TO_AVENUE[problemType];
      expect(AVENUE_REGISTRY[target].enabled).toBe(true);
      const res = routeProblem(problemType);
      expect(res.ok).toBe(true);
      if (res.ok) expect(ENABLED_AVENUES).toContain(res.avenue.key);
    }
  });

  it("a mapping that targets a deferred avenue yields a typed avenue_disabled error", () => {
    const disabledMapping: Record<ProblemType, AvenueKey> = {
      ...PROBLEM_TYPE_TO_AVENUE,
      refund: "insurance_claim",
    };
    const res = routeProblem("refund", disabledMapping);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("avenue_disabled");
  });

  it("routeSituation defers to the situation's problemType", () => {
    const res = routeSituation({
      situation: {
        id: "sit_x",
        merchant: "Uber",
        detectedAt: "2026-06-10T10:00:00.000Z",
        summary: "dup",
      },
      problemType: "double_charge",
      merchant: "Uber",
      amountCents: 5140,
      evidenceTxnIds: ["t1", "t2"],
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.avenue.key).toBe("billing_error_correction");
  });
});

describe("P3 · LearningLoop: win-rate store, no division by zero", () => {
  it("reports 0 win-rate with no data and updates as outcomes land", () => {
    const loop = new LearningLoop(new InMemoryWinRateStore());
    expect(loop.winRate("fee_reversal")).toBe(0);

    loop.recordOutcome("fee_reversal", true);
    loop.recordOutcome("fee_reversal", true);
    const report = loop.recordOutcome("fee_reversal", false);
    expect(report.stat).toEqual({ wins: 2, losses: 1 });
    expect(loop.winRate("fee_reversal")).toBeCloseTo(2 / 3, 5);
  });

  it("ranks avenues by win-rate, best first", () => {
    const loop = new LearningLoop();
    loop.recordOutcome("merchant_refund", true);
    loop.recordOutcome("merchant_refund", false);
    loop.recordOutcome("fee_reversal", true);
    const ranks = loop.rankings();
    expect(ranks[0].avenue).toBe("fee_reversal"); // 1.0 beats 0.5
    expect(ranks[0].winRate).toBe(1);
  });
});

// ── Shared fixture for rankByContext tests ────────────────────────────────────
const ctx = (
  occupationType: OccupationContext["occupationType"],
  hints: string[] = [],
): OccupationContext => ({
  occupationType,
  platforms: [],
  priorityAvenueHints: hints,
});

const sit = (problemType: ProblemType, merchant = "Acme") =>
  ({
    situation: {
      id: `s_${problemType}`,
      merchant,
      detectedAt: "2026-06-14T00:00:00Z",
      summary: "",
    },
    problemType,
    merchant,
    amountCents: 100,
    evidenceTxnIds: [],
  }) as const;

describe("P6 · rankByContext: surfaces most relevant situations first", () => {
  it("gig_worker: double_charge rises above fee_reversal in detection order", () => {
    const sits = [sit("fee_reversal"), sit("double_charge"), sit("subscription")];
    const ranked = rankByContext(sits, ctx("gig_worker"));
    expect(ranked[0].problemType).toBe("double_charge");
    expect(ranked[1].problemType).toBe("fee_reversal");
  });

  it("employee: fee_reversal is top priority", () => {
    const sits = [sit("subscription"), sit("billing_error"), sit("fee_reversal")];
    const ranked = rankByContext(sits, ctx("employee"));
    expect(ranked[0].problemType).toBe("fee_reversal");
  });

  it("student: subscription surfaces first", () => {
    const sits = [sit("double_charge"), sit("subscription"), sit("billing_error")];
    const ranked = rankByContext(sits, ctx("student"));
    expect(ranked[0].problemType).toBe("subscription");
  });

  it("other: no reranking — original order preserved", () => {
    const sits = [sit("billing_error"), sit("fee_reversal"), sit("double_charge")];
    const ranked = rankByContext(sits, ctx("other"));
    expect(ranked.map((s) => s.problemType)).toEqual([
      "billing_error",
      "fee_reversal",
      "double_charge",
    ]);
  });

  it("explicit priorityAvenueHints override occupation defaults", () => {
    const sits = [sit("double_charge"), sit("fee_reversal"), sit("subscription")];
    const ranked = rankByContext(sits, ctx("gig_worker", ["subscription", "fee_reversal"]));
    expect(ranked[0].problemType).toBe("subscription");
    expect(ranked[1].problemType).toBe("fee_reversal");
  });

  it("is stable — equal-priority items keep original detection order", () => {
    const a = {
      ...sit("double_charge", "AcmeA"),
      situation: { ...sit("double_charge", "AcmeA").situation, id: "s1" },
    };
    const b = {
      ...sit("double_charge", "AcmeB"),
      situation: { ...sit("double_charge", "AcmeB").situation, id: "s2" },
    };
    const ranked = rankByContext([a, b], ctx("gig_worker"));
    expect(ranked[0].situation.id).toBe("s1");
    expect(ranked[1].situation.id).toBe("s2");
  });
});
