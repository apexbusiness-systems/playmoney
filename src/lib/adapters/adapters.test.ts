import { afterEach, describe, expect, it } from "vitest";
import { FlinksAccountDataAdapter, PlaidAccountDataAdapter, createAccountDataAdapter } from "./account-data";
import { StripePayoutAdapter, createPayoutAdapter } from "./payout";

afterEach(() => {
  delete process.env.PLAYMONEY_MODE;
});

describe("P4 · Adapters are sealed in BUILT — no real outbound call escapes", () => {
  it("FlinksAccountDataAdapter throws LiveModeBlockedError in BUILT before any HTTP call", async () => {
    const adapter = new FlinksAccountDataAdapter("https://flinks.example.com", "client-id");
    await expect(adapter.listTransactions({ aggregatorToken: "tok" })).rejects.toThrow(
      "BLOCKED",
    );
  });

  it("PlaidAccountDataAdapter throws LiveModeBlockedError in BUILT", async () => {
    const adapter = new PlaidAccountDataAdapter("sandbox", "cid", "secret");
    await expect(adapter.listTransactions({ aggregatorToken: "tok" })).rejects.toThrow(
      "BLOCKED",
    );
  });

  it("StripePayoutAdapter throws LiveModeBlockedError in BUILT", async () => {
    const adapter = new StripePayoutAdapter("sk_test_fake");
    await expect(
      adapter.chargeFee({ feeCents: 1000, customerRef: "cus_x", idempotencyKey: "idem" }),
    ).rejects.toThrow("BLOCKED");
  });

  it("factory stubs also seal in BUILT (no adapter configured)", async () => {
    const acct = createAccountDataAdapter({});
    await expect(acct.listTransactions({ aggregatorToken: "tok" })).rejects.toThrow("BLOCKED");

    const payout = createPayoutAdapter({});
    await expect(
      payout.chargeFee({ feeCents: 500, customerRef: "cus_y", idempotencyKey: "i" }),
    ).rejects.toThrow("BLOCKED");
  });
});
