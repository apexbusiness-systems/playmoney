import { describe, expect, it } from "vitest";
import { buildLoa, verifyLoa, revokeLoa, type ESignature, type LoaScope } from "./loa";

const sig: ESignature = {
  signedBy: "Maya Chen",
  signedAt: "2026-06-14T12:00:00Z",
  method: "click_accept",
  statement: "I authorize PlayMoney to pursue this refund on my behalf.",
  consentElectronic: true,
};

const scope: LoaScope = {
  avenue: "merchant_refund",
  merchant: "Delta Airlines",
  maxAmountCents: 24000,
};

function makeToken(over: Partial<Parameters<typeof buildLoa>[0]> = {}) {
  return buildLoa({
    ownerId: "user_1",
    recoveryId: "rec_0004",
    scope,
    signature: sig,
    ttlMinutes: 60,
    idempotencyKey: "idem_1",
    now: new Date("2026-06-14T12:00:00Z"),
    ...over,
  });
}

const action = {
  recoveryId: "rec_0004",
  avenue: "merchant_refund",
  merchant: "Delta Airlines",
  amountCents: 24000,
};
const NOW = new Date("2026-06-14T12:10:00Z");

describe("T3 · execute requires a valid, scoped, unexpired, unrevoked e-LOA (#6/#7)", () => {
  it("verifies a matching in-scope action", () => {
    expect(verifyLoa(makeToken(), action, NOW).valid).toBe(true);
  });

  it("rejects when there is no token", () => {
    const r = verifyLoa(null, action, NOW);
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.code).toBe("no_token");
  });

  it("rejects a revoked token", () => {
    const r = verifyLoa(revokeLoa(makeToken()), action, NOW);
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.code).toBe("revoked");
  });

  it("rejects an expired token", () => {
    const r = verifyLoa(makeToken({ ttlMinutes: 1 }), action, new Date("2026-06-14T13:00:00Z"));
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.code).toBe("expired");
  });

  it("rejects a wrong-recovery action", () => {
    const r = verifyLoa(makeToken(), { ...action, recoveryId: "rec_9999" }, NOW);
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.code).toBe("wrong_recovery");
  });

  it("rejects an avenue outside scope", () => {
    const r = verifyLoa(makeToken(), { ...action, avenue: "fee_reversal" }, NOW);
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.code).toBe("scope_avenue_mismatch");
  });

  it("rejects a merchant outside scope", () => {
    const r = verifyLoa(makeToken(), { ...action, merchant: "United" }, NOW);
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.code).toBe("scope_merchant_mismatch");
  });

  it("rejects an amount above the scope cap", () => {
    const r = verifyLoa(makeToken(), { ...action, amountCents: 24001 }, NOW);
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.code).toBe("amount_exceeds_scope");
  });

  it("refuses to build an LOA for a disabled avenue", () => {
    expect(() => makeToken({ scope: { ...scope, avenue: "insurance_claim" } })).toThrow();
  });

  it("refuses to build an LOA without electronic consent", () => {
    // @ts-expect-error consentElectronic must be literal true
    expect(() => makeToken({ signature: { ...sig, consentElectronic: false } })).toThrow();
  });
});
