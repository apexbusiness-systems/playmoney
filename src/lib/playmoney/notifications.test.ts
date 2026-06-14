import { describe, expect, it } from "vitest";
import { Notification } from "./types";

describe("T8 · notifications emit only money_landed / needs_signature (#16)", () => {
  const allowed = ["money_landed", "needs_signature"] as const;

  it("the Notification.type enum is exactly the two money-only kinds", () => {
    const typeField = Notification.shape.type;
    expect([...typeField.options].sort()).toEqual([...allowed].sort());
  });

  it("rejects any non-money notification type (e.g. marketing)", () => {
    const base = { id: "n1", recoveryId: "rec_0001", message: "x", ts: "t", read: false };
    for (const type of allowed) {
      expect(Notification.safeParse({ ...base, type }).success).toBe(true);
    }
    expect(Notification.safeParse({ ...base, type: "marketing" }).success).toBe(false);
    expect(Notification.safeParse({ ...base, type: "promo" }).success).toBe(false);
  });
});
