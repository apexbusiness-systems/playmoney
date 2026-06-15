import { describe, expect, it } from "vitest";
import { contextPriority, rankByContextKey } from "./situation";
import type { OccupationContext } from "@/lib/playmoney/types";

const ctx = (over: Partial<OccupationContext> = {}): OccupationContext => ({
  occupationType: "gig_worker",
  platforms: [],
  priorityAvenueHints: [],
  ...over,
});

describe("engine · contextPriority", () => {
  it("uses the occupation's default ordering when no hints are given", () => {
    expect(contextPriority(ctx({ occupationType: "gig_worker" }))).toEqual([
      "double_charge",
      "fee_reversal",
      "refund",
    ]);
  });

  it("prefers explicit priorityAvenueHints over the occupation default", () => {
    expect(contextPriority(ctx({ priorityAvenueHints: ["subscription"] }))).toEqual([
      "subscription",
    ]);
  });

  it("returns empty (no opinion) for 'other'", () => {
    expect(contextPriority(ctx({ occupationType: "other" }))).toEqual([]);
  });
});

describe("engine · rankByContextKey (powers the dashboard re-rank on Recovery.avenue)", () => {
  type Win = {
    id: string;
    avenue: "refund" | "fee_reversal" | "subscription" | "billing_error" | "double_charge";
  };
  const wins: Win[] = [
    { id: "a", avenue: "subscription" },
    { id: "b", avenue: "double_charge" },
    { id: "c", avenue: "fee_reversal" },
  ];

  it("surfaces the occupation's priority problem types first", () => {
    const ranked = rankByContextKey(wins, (w) => w.avenue, ctx({ occupationType: "gig_worker" }));
    // gig_worker priority: double_charge, fee_reversal, refund -> b, c, then rest
    expect(ranked.map((w) => w.id)).toEqual(["b", "c", "a"]);
  });

  it("is pure (no input mutation) and preserves order when context has no opinion", () => {
    const input = [...wins];
    const ranked = rankByContextKey(input, (w) => w.avenue, ctx({ occupationType: "other" }));
    expect(ranked.map((w) => w.id)).toEqual(["a", "b", "c"]);
    expect(input.map((w) => w.id)).toEqual(["a", "b", "c"]);
  });
});
