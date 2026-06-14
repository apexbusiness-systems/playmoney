import { describe, expect, it } from "vitest";
import {
  enqueueForReview,
  approveReview,
  rejectReview,
  isApprovedForSend,
  type LegitimacyAttestation,
} from "./review";

const attestation: LegitimacyAttestation = {
  attestedBy: "user_1",
  attestedAt: "2026-06-14T12:00:00Z",
  statement: "This duplicate charge is legitimate.",
  isLegitimate: true,
  noFrivolousChargeback: true,
};

function makeItem() {
  return enqueueForReview({
    ownerId: "user_1",
    recoveryId: "rec_0001",
    actionType: "send_refund_request",
    attestation,
    evidence: [{ kind: "receipt", ref: "evidence/r1.pdf" }],
    idempotencyKey: "idem_review_1",
    now: new Date("2026-06-14T12:00:00Z"),
  });
}

describe("T7 · no send/execute without passing human review (#14)", () => {
  it("enqueues a pending item with attestation + evidence", () => {
    const item = makeItem();
    expect(item.status).toBe("pending");
    expect(isApprovedForSend(item)).toBe(false); // pending => not sendable
  });

  it("requires evidence to enqueue", () => {
    expect(() =>
      enqueueForReview({
        ownerId: "user_1",
        recoveryId: "rec_0001",
        actionType: "send_refund_request",
        attestation,
        evidence: [],
        idempotencyKey: "idem_x",
      }),
    ).toThrow(/evidence/i);
  });

  it("requires the no-frivolous-chargeback attestation", () => {
    expect(() =>
      enqueueForReview({
        ownerId: "user_1",
        recoveryId: "rec_0001",
        actionType: "send_refund_request",
        // @ts-expect-error noFrivolousChargeback must be literal true
        attestation: { ...attestation, noFrivolousChargeback: false },
        evidence: [{ kind: "receipt", ref: "e.pdf" }],
        idempotencyKey: "idem_y",
      }),
    ).toThrow();
  });

  it("becomes sendable only after a human approves", () => {
    const approved = approveReview(makeItem(), "reviewer_jane", "looks legit");
    expect(approved.status).toBe("approved");
    expect(approved.reviewedBy).toBe("reviewer_jane");
    expect(isApprovedForSend(approved)).toBe(true);
  });

  it("a rejected item is never sendable", () => {
    const rejected = rejectReview(makeItem(), "reviewer_jane", "insufficient evidence");
    expect(rejected.status).toBe("rejected");
    expect(isApprovedForSend(rejected)).toBe(false);
  });

  it("a decision requires a named reviewer", () => {
    expect(() => approveReview(makeItem(), "  ")).toThrow(/reviewer/i);
  });

  it("isApprovedForSend is false for null/undefined", () => {
    expect(isApprovedForSend(null)).toBe(false);
    expect(isApprovedForSend(undefined)).toBe(false);
  });
});
