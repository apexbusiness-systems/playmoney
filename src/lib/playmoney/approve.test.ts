import { describe, it, expect } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { approveRecovery, RECOVERIES_KEY } from "./approve";
import type { Recovery } from "./types";

function makeRec(overrides: Partial<Recovery> = {}): Recovery {
  return {
    id: "rec_0001",
    merchant: "Comcast",
    avenue: "billing_error",
    reason: "Charged for cancelled line",
    grossAmount: 11862,
    userNet: 9490,
    ourFee: 2372,
    status: "needs_approval",
    idempotencyKey: "idem_1_comcast",
    createdAt: "2026-06-14T00:00:00Z",
    updatedAt: "2026-06-14T00:00:00Z",
    ...overrides,
  };
}

function seed(qc: QueryClient, recs: Recovery[]) {
  qc.setQueryData(RECOVERIES_KEY, recs);
}

describe("approveRecovery (optimistic + rollback)", () => {
  it("optimistically flips the card to on_the_way on success", async () => {
    const qc = new QueryClient();
    const rec = makeRec();
    seed(qc, [rec]);

    await approveRecovery({ qc, rec, run: async () => ({ ok: true }) });

    const after = qc.getQueryData<Recovery[]>(RECOVERIES_KEY)!;
    expect(after[0].status).toBe("on_the_way");
  });

  it("ROLLS BACK the cache when the approval fails (regression: P0 — no failure path)", async () => {
    const qc = new QueryClient();
    const rec = makeRec();
    seed(qc, [rec]);

    await expect(
      approveRecovery({
        qc,
        rec,
        run: async () => {
          throw new Error("network down");
        },
      }),
    ).rejects.toThrow("network down");

    // The card must NOT be left stuck on "on_the_way".
    const after = qc.getQueryData<Recovery[]>(RECOVERIES_KEY)!;
    expect(after[0].status).toBe("needs_approval");
  });

  it("only touches the approved recovery, leaving siblings untouched", async () => {
    const qc = new QueryClient();
    const target = makeRec({ id: "rec_0001" });
    const sibling = makeRec({ id: "rec_0002", status: "found" });
    seed(qc, [target, sibling]);

    await approveRecovery({ qc, rec: target, run: async () => undefined });

    const after = qc.getQueryData<Recovery[]>(RECOVERIES_KEY)!;
    expect(after.find((r) => r.id === "rec_0001")!.status).toBe("on_the_way");
    expect(after.find((r) => r.id === "rec_0002")!.status).toBe("found");
  });
});
