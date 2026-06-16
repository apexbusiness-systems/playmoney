import { afterEach, describe, expect, it } from "vitest";
import { executeRecoveryAction } from "./executor";
import { buildLoa, type ESignature, type LoaScope } from "./loa";
import { enqueueForReview, approveReview, type LegitimacyAttestation } from "./review";
import { GATE_KEYS, type GateStatus } from "./gates";

const sig: ESignature = {
  signedBy: "Maya Chen",
  signedAt: "2026-06-14T12:00:00Z",
  method: "click_accept",
  statement: "I authorize PlayMoney to pursue this refund.",
  consentElectronic: true,
};
const scope: LoaScope = {
  avenue: "merchant_refund",
  merchant: "Delta Airlines",
  maxAmountCents: 24000,
};
const action = {
  recoveryId: "rec_0004",
  avenue: "merchant_refund",
  merchant: "Delta Airlines",
  amountCents: 24000,
};
const NOW = new Date("2026-06-14T12:05:00Z");
const ALL_GREEN: GateStatus = Object.fromEntries(GATE_KEYS.map((k) => [k, true])) as GateStatus;

const attestation: LegitimacyAttestation = {
  attestedBy: "user_1",
  attestedAt: "2026-06-14T12:00:00Z",
  statement: "Legitimate duplicate charge.",
  isLegitimate: true,
  noFrivolousChargeback: true,
};

function validLoa() {
  return buildLoa({
    ownerId: "user_1",
    recoveryId: "rec_0004",
    scope,
    signature: sig,
    ttlMinutes: 60,
    idempotencyKey: "idem_1",
    now: new Date("2026-06-14T12:00:00Z"),
  });
}
function approvedReview() {
  const item = enqueueForReview({
    ownerId: "user_1",
    recoveryId: "rec_0004",
    actionType: "send_refund_request",
    attestation,
    evidence: [{ kind: "receipt", ref: "e.pdf" }],
    idempotencyKey: "idem_r1",
    now: new Date("2026-06-14T12:00:00Z"),
  });
  return approveReview(item, "reviewer_jane");
}

const perform = async () => "REAL_SEND_DONE";

afterEach(() => {
  delete process.env.PLAYMONEY_MODE;
});

describe("#7 MAN-Mode Executor — LOA + review + mode gate (T3, T7, §6)", () => {
  it("rejects an action with no LOA token", async () => {
    const r = await executeRecoveryAction({
      action,
      loaToken: null,
      reviewItem: approvedReview(),
      gateStatus: ALL_GREEN,
      perform,
      now: NOW,
    });
    expect(r.status).toBe("rejected");
    if (r.status === "rejected") expect(r.code).toBe("loa_invalid");
  });

  it("rejects an out-of-scope action even with a token", async () => {
    const r = await executeRecoveryAction({
      action: { ...action, amountCents: 99999 },
      loaToken: validLoa(),
      reviewItem: approvedReview(),
      gateStatus: ALL_GREEN,
      perform,
      now: NOW,
    });
    expect(r.status).toBe("rejected");
    if (r.status === "rejected") expect(r.code).toBe("loa_invalid");
  });

  it("rejects when the review item is not approved", async () => {
    const pending = enqueueForReview({
      ownerId: "user_1",
      recoveryId: "rec_0004",
      actionType: "send_refund_request",
      attestation,
      evidence: [{ kind: "receipt", ref: "e.pdf" }],
      idempotencyKey: "idem_r2",
    });
    const r = await executeRecoveryAction({
      action,
      loaToken: validLoa(),
      reviewItem: pending,
      gateStatus: ALL_GREEN,
      perform,
      now: NOW,
    });
    expect(r.status).toBe("rejected");
    if (r.status === "rejected") expect(r.code).toBe("review_not_approved");
  });

  it("SEALS execution in BUILT mode even when authorized + reviewed + gates green", async () => {
    const r = await executeRecoveryAction({
      action,
      loaToken: validLoa(),
      reviewItem: approvedReview(),
      gateStatus: ALL_GREEN,
      perform,
      now: NOW,
    });
    expect(r.status).toBe("sealed"); // default BUILT => no real send
  });

  it("executes ONLY when LIVE + all gates green + LOA + review", async () => {
    process.env.PLAYMONEY_MODE = "LIVE";
    const r = await executeRecoveryAction({
      action,
      loaToken: validLoa(),
      reviewItem: approvedReview(),
      gateStatus: ALL_GREEN,
      perform,
      now: NOW,
    });
    expect(r.status).toBe("executed");
    if (r.status === "executed") expect(r.result).toBe("REAL_SEND_DONE");
  });

  it("stays sealed in LIVE if any gate is unmet", async () => {
    process.env.PLAYMONEY_MODE = "LIVE";
    const r = await executeRecoveryAction({
      action,
      loaToken: validLoa(),
      reviewItem: approvedReview(),
      gateStatus: { ...ALL_GREEN, "G-counsel": false },
      perform,
      now: NOW,
    });
    expect(r.status).toBe("sealed");
  });
});
