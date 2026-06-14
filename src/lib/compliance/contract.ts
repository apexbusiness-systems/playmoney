// M3 · Consumer e-contract + PAD/Consent (Controls #11, #12) [GATE]
//
// #11 Alberta CPA (C-26.3) internet-sales agreement: ToS must disclose total
//     cost, fee basis, and cancellation rights, and a delivered copy is retained
//     against the user record.
// #12 Payments Canada Rule H1 PAD / card-on-file consent: advance notice of
//     amount/date + a cancellation/recourse path; consent captured immutably.
//
// This module builds + validates the records and consent objects. It does NOT
// draft the legal text — final ToS/Privacy copy is external counsel's (residual).

import { z } from "zod";

/** Rule H1 default advance-notice window for personal PADs (calendar days). */
export const MIN_PAD_ADVANCE_NOTICE_DAYS = 10;

export const AgreementType = z.enum(["tos", "privacy", "pad"]);
export type AgreementType = z.infer<typeof AgreementType>;

/** CPA C-26.3 internet-sales agreement: the required disclosures must be present. */
export const InternetSalesAgreement = z.object({
  type: z.literal("tos"),
  version: z.string().min(1),
  title: z.string().min(1),
  totalCostDisclosure: z.string().min(1), // total cost to the consumer
  feeBasis: z.string().min(1), // how the fee is calculated
  cancellationRights: z.string().min(1), // cancellation rights
  deliveredCopyRef: z.string().min(1), // retained/delivered copy reference
  contentHash: z.string().min(1),
});
export type InternetSalesAgreement = z.infer<typeof InternetSalesAgreement>;

export function validateInternetSalesAgreement(input: unknown): InternetSalesAgreement {
  return InternetSalesAgreement.parse(input);
}

export const AcceptanceRecord = z.object({
  id: z.string(),
  ownerId: z.string(),
  agreementType: AgreementType,
  agreementVersion: z.string().min(1),
  contentHash: z.string().min(1),
  acceptedAt: z.string().min(1),
});
export type AcceptanceRecord = z.infer<typeof AcceptanceRecord>;

/** Builds an immutable acceptance record (delivered-copy retention, #11). */
export function recordAcceptance(input: {
  id?: string;
  ownerId: string;
  agreementType: AgreementType;
  agreementVersion: string;
  contentHash: string;
  now?: Date;
}): AcceptanceRecord {
  return AcceptanceRecord.parse({
    id: input.id ?? crypto.randomUUID(),
    ownerId: input.ownerId,
    agreementType: input.agreementType,
    agreementVersion: input.agreementVersion,
    contentHash: input.contentHash,
    acceptedAt: (input.now ?? new Date()).toISOString(),
  });
}

export const PadMethod = z.enum(["pad", "card_on_file"]);
export type PadMethod = z.infer<typeof PadMethod>;

export const PadConsent = z.object({
  id: z.string(),
  ownerId: z.string(),
  method: PadMethod,
  amountBasis: z.string().min(1), // advance notice of amount/date basis
  advanceNoticeDays: z.number().int().nonnegative(),
  cancellationPath: z.string().min(1), // cancellation + recourse path (Rule H1)
  status: z.enum(["active", "cancelled"]),
  consentedAt: z.string().min(1),
  cancelledAt: z.string().nullable().optional(),
});
export type PadConsent = z.infer<typeof PadConsent>;

/**
 * Builds a Rule H1-compliant consent. Personal PADs require >= 10 days advance
 * notice unless the consumer explicitly waives it; card-on-file requires the
 * cancellation/recourse path. Throws on non-compliant input (zero silent fail).
 */
export function buildPadConsent(input: {
  id?: string;
  ownerId: string;
  method: PadMethod;
  amountBasis: string;
  advanceNoticeDays: number;
  cancellationPath: string;
  waiveAdvanceNotice?: boolean;
  now?: Date;
}): PadConsent {
  if (input.method === "pad" && !input.waiveAdvanceNotice) {
    if (input.advanceNoticeDays < MIN_PAD_ADVANCE_NOTICE_DAYS) {
      throw new Error(
        `PAD consent requires >= ${MIN_PAD_ADVANCE_NOTICE_DAYS} days advance notice (Rule H1) unless waived`,
      );
    }
  }
  if (!input.cancellationPath.trim()) {
    throw new Error("PAD/card consent requires a cancellation + recourse path (Rule H1)");
  }
  return PadConsent.parse({
    id: input.id ?? crypto.randomUUID(),
    ownerId: input.ownerId,
    method: input.method,
    amountBasis: input.amountBasis,
    advanceNoticeDays: input.advanceNoticeDays,
    cancellationPath: input.cancellationPath,
    status: "active",
    consentedAt: (input.now ?? new Date()).toISOString(),
    cancelledAt: null,
  });
}

/** Cancels a PAD/card consent (recourse path, #12). Idempotent. */
export function cancelPadConsent(consent: PadConsent, now: Date = new Date()): PadConsent {
  return { ...consent, status: "cancelled", cancelledAt: consent.cancelledAt ?? now.toISOString() };
}
