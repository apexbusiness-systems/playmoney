// M5 · Fraud/Abuse + Human-Review-Before-Send queue (Control #14) [GATE]
//
// No outbound/execute action sends without passing a mandatory human review.
// Enqueuing requires a user legitimacy attestation (incl. an explicit
// no-frivolous-chargeback acknowledgement) and captured evidence. The
// send/execute path drains ONLY items whose status is 'approved'.

import { z } from "zod";

export const NO_FRIVOLOUS_CHARGEBACK_POLICY =
  "I confirm this claim is legitimate and that I will not file a frivolous or friendly chargeback for a recovery PlayMoney obtains.";

export const LegitimacyAttestation = z.object({
  attestedBy: z.string().min(1),
  attestedAt: z.string().min(1),
  statement: z.string().min(1),
  isLegitimate: z.literal(true),
  noFrivolousChargeback: z.literal(true),
});
export type LegitimacyAttestation = z.infer<typeof LegitimacyAttestation>;

export const EvidenceItem = z.object({
  kind: z.string().min(1),
  ref: z.string().min(1),
});
export type EvidenceItem = z.infer<typeof EvidenceItem>;

export const ReviewStatus = z.enum(["pending", "approved", "rejected"]);
export type ReviewStatus = z.infer<typeof ReviewStatus>;

export const ReviewItem = z.object({
  id: z.string(),
  ownerId: z.string(),
  recoveryId: z.string(),
  actionType: z.string().min(1),
  payload: z.record(z.string(), z.unknown()).default({}),
  attestation: LegitimacyAttestation,
  evidence: z.array(EvidenceItem),
  status: ReviewStatus,
  reviewedBy: z.string().nullable().optional(),
  reviewedAt: z.string().nullable().optional(),
  decisionNote: z.string().nullable().optional(),
  idempotencyKey: z.string(),
  createdAt: z.string(),
});
export type ReviewItem = z.infer<typeof ReviewItem>;

/**
 * Builds a PENDING review item. Requires a valid legitimacy attestation and at
 * least one piece of evidence (no-frivolous, evidence capture — #14). Throws on
 * non-compliant input; zero silent failures.
 */
export function enqueueForReview(input: {
  id?: string;
  ownerId: string;
  recoveryId: string;
  actionType: string;
  payload?: Record<string, unknown>;
  attestation: LegitimacyAttestation;
  evidence: EvidenceItem[];
  idempotencyKey: string;
  now?: Date;
}): ReviewItem {
  LegitimacyAttestation.parse(input.attestation);
  if (!input.evidence || input.evidence.length === 0) {
    throw new Error("Human review requires at least one captured evidence item (#14)");
  }
  return ReviewItem.parse({
    id: input.id ?? crypto.randomUUID(),
    ownerId: input.ownerId,
    recoveryId: input.recoveryId,
    actionType: input.actionType,
    payload: input.payload ?? {},
    attestation: input.attestation,
    evidence: input.evidence,
    status: "pending",
    reviewedBy: null,
    reviewedAt: null,
    decisionNote: null,
    idempotencyKey: input.idempotencyKey,
    createdAt: (input.now ?? new Date()).toISOString(),
  });
}

function decide(
  item: ReviewItem,
  status: "approved" | "rejected",
  reviewer: string,
  note: string | undefined,
  now: Date,
): ReviewItem {
  if (!reviewer.trim()) throw new Error("A human reviewer must be named to decide a review item");
  return ReviewItem.parse({
    ...item,
    status,
    reviewedBy: reviewer,
    reviewedAt: now.toISOString(),
    decisionNote: note ?? null,
  });
}

export function approveReview(item: ReviewItem, reviewer: string, note?: string, now: Date = new Date()): ReviewItem {
  return decide(item, "approved", reviewer, note, now);
}

export function rejectReview(item: ReviewItem, reviewer: string, note?: string, now: Date = new Date()): ReviewItem {
  return decide(item, "rejected", reviewer, note, now);
}

/** The send/execute gate: true ONLY for human-approved items (#14). */
export function isApprovedForSend(item: ReviewItem | null | undefined): boolean {
  if (!item) return false;
  return item.status === "approved" && !!item.reviewedBy && !!item.reviewedAt;
}
