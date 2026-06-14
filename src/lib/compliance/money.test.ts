import { describe, expect, it } from "vitest";
import * as money from "./money";
import { cents, userPayoutRef } from "./money";

describe("T1 · non-custodial by type — no fund-holding surface exists", () => {
  it("the money module exposes NO custody/escrow/pooled/wallet construct", () => {
    const forbidden = /escrow|fbo|pooled|wallet|stored_?value|float|custod|balance|hold/i;
    const offending = Object.keys(money).filter((k) => forbidden.test(k));
    expect(offending).toEqual([]);
  });

  it("the only recovery destination is the user's own tokenised payout ref", () => {
    const ref = userPayoutRef("tok_payout_abc123x");
    // RecoveryDestination is structurally identical to UserPayoutRef.
    const dest: money.RecoveryDestination = ref;
    expect(typeof dest).toBe("string");
  });

  it("rejects raw-credential-looking payout refs", () => {
    expect(() => userPayoutRef("123456789012")).toThrow(/tokenised/);
    expect(() => userPayoutRef("my password is hunter2")).toThrow(/tokenised/);
    expect(() => userPayoutRef("")).toThrow();
  });

  it("FeeCharge links a recovery only by id, with no money-movement field", () => {
    const fee: money.FeeCharge = {
      recoveryId: "rec_0001",
      amount: cents(700),
      idempotencyKey: "idem_fee_1",
    };
    // The shape carries no payout/destination/settlement field that could net a
    // fee out of a recovery in transit (#2).
    expect(Object.keys(fee).sort()).toEqual(["amount", "idempotencyKey", "recoveryId"]);
  });

  it("cents must be a non-negative integer", () => {
    expect(cents(0)).toBe(0);
    expect(() => cents(1.5)).toThrow();
    expect(() => cents(-1)).toThrow();
  });
});

// Compile-time guard (T1, negative): if anyone makes the brand assignable from a
// raw string without the constructor, this stops compiling. tsc --noEmit checks it.
// @ts-expect-error UserPayoutRef must not be constructible from a bare string.
const _illegal: money.UserPayoutRef = "raw-string-not-via-constructor";
void _illegal;
