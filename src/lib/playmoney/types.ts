import { z } from "zod";
import type { OnboardingInput, OnboardingResult } from "@/lib/api/onboarding.core";

export const SubscriptionRefundType = z.enum(["original_payment_method", "store_credit"]);
export type SubscriptionRefundType = z.infer<typeof SubscriptionRefundType>;

export const MerchantContact = z.object({
  email: z.string().email().optional(),
  url: z.string().url().optional(),
  method: z.enum(["directory", "manual"]),
});
export type MerchantContact = z.infer<typeof MerchantContact>;

export class IntakeRejectionError extends Error {
  readonly code = "not_eligible_credit_only" as const;
  constructor(reason: string) {
    super(reason);
    this.name = "IntakeRejectionError";
  }
}

export const OccupationType = z.enum([
  "employee",
  "gig_worker",
  "freelancer",
  "small_business",
  "student",
  "other",
]);
export type OccupationType = z.infer<typeof OccupationType>;

export const OccupationContext = z.object({
  occupationType: OccupationType,
  platforms: z.array(z.string()).default([]),
  priorityAvenueHints: z.array(z.string()).default([]),
});
export type OccupationContext = z.infer<typeof OccupationContext>;

export const RecoveryStatus = z.enum(["found", "needs_approval", "on_the_way", "landed"]);
export type RecoveryStatus = z.infer<typeof RecoveryStatus>;

export const RecoveryAvenue = z.enum([
  "refund",
  "fee_reversal",
  "subscription",
  "billing_error",
  "double_charge",
]);
export type RecoveryAvenue = z.infer<typeof RecoveryAvenue>;

export const Profile = z.object({
  id: z.string(),
  displayName: z.string(),
  email: z.string().email(),
  payoutRef: z.string(), // tokenised reference, never raw credentials
  identityVerified: z.boolean(),
  createdAt: z.string(),
  context: OccupationContext.optional(),
  country: z.string().optional(), // jurisdiction country code (CA / US)
});
export type Profile = z.infer<typeof Profile>;

export const Situation = z.object({
  id: z.string(),
  merchant: z.string(),
  detectedAt: z.string(),
  summary: z.string(),
});
export type Situation = z.infer<typeof Situation>;

export const Recovery = z.object({
  id: z.string(),
  merchant: z.string(),
  avenue: RecoveryAvenue,
  reason: z.string(),
  grossAmount: z.number(), // cents
  userNet: z.number(),
  ourFee: z.number(),
  status: RecoveryStatus,
  idempotencyKey: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Recovery = z.infer<typeof Recovery>;

export const RecoveryEvent = z.object({
  id: z.string(),
  recoveryId: z.string(),
  kind: z.string(),
  note: z.string(),
  ts: z.string(),
});
export type RecoveryEvent = z.infer<typeof RecoveryEvent>;

export const Approval = z.object({
  id: z.string(),
  recoveryId: z.string(),
  approvalToken: z.string(),
  approvedBy: z.string(),
  ts: z.string(),
});
export type Approval = z.infer<typeof Approval>;

export const FeeLedgerEntry = z.object({
  id: z.string(),
  recoveryId: z.string(),
  feeAmount: z.number(),
  ts: z.string(),
});
export type FeeLedgerEntry = z.infer<typeof FeeLedgerEntry>;

export const Notification = z.object({
  id: z.string(),
  type: z.enum(["money_landed", "needs_signature"]),
  recoveryId: z.string(),
  message: z.string(),
  ts: z.string(),
  read: z.boolean(),
});
export type Notification = z.infer<typeof Notification>;

/**
 * Honest sealed-until-LIVE signal. Returned (never thrown as a 500) when a bank
 * adapter path is reached in BUILT mode — the underlying adapter throws
 * LiveModeBlockedError, which the server fn catches and translates into this typed
 * result so the UI can show a truthful "coming soon" state instead of a dead URL or
 * a fabricated success. The seal itself is NOT weakened; this only renders it honest.
 */
export type SealedUntilLive = { ok: false; code: "sealed_until_live"; message: string };

/** Result of building a bank-connect URL: a real URL, or sealed-until-live. */
export type ConnectUrlResult = { ok: true; connectUrl: string } | SealedUntilLive;

/** Result of ingesting bank transactions: a real situation count, or sealed-until-live. */
export type IngestResult = { ok: true; situationCount: number } | SealedUntilLive;

export interface ApiClient {
  listRecoveries(): Promise<Recovery[]>;
  getRecovery(id: string): Promise<Recovery | null>;
  approveRecovery(input: {
    recoveryId: string;
    idempotencyKey: string;
    merchantContact: MerchantContact;
    refundType?: SubscriptionRefundType;
  }): Promise<Approval>;
  listNotifications(): Promise<Notification[]>;
  listFeeLedger(): Promise<FeeLedgerEntry[]>;
  totals(): Promise<{ foundTotal: number; landedTotal: number; ourFeeTotal: number }>;
  exportData(): Promise<Blob>;
  deleteAllData(): Promise<void>;

  /** Saga pipeline: convert a detected situation into an active recovery pipeline */
  initiateRecovery(input: { situationId: string }): Promise<{ recoveryId: string }>;
}

export interface AuthClient {
  getProfile(): Promise<Profile | null>;
  signIn(input: { email: string }): Promise<Profile>;
  /** Confirm a magic-link OTP code. On success the Supabase session is established. */
  verifyOtp(input: { email: string; token: string }): Promise<void>;
  /** Handle a Supabase magic-link redirect (PKCE flow — token_hash from URL). */
  verifyOtpHash(input: { tokenHash: string; type: string }): Promise<void>;
  signOut(): Promise<void>;
  updateProfile(patch: Partial<Profile>): Promise<Profile>;
  saveContext(context: OccupationContext): Promise<Profile>;
  submitOnboarding(input: OnboardingInput): Promise<OnboardingResult>;
  /**
   * Persist PSP/aggregator REFERENCES issued once a user goes LIVE (Stripe customer id,
   * Flinks/Plaid OAuth token). Owner-scoped (RLS session). References, not money (#1).
   */
  saveAdapterRefs(refs: { stripeCustomerRef?: string; aggregatorToken?: string }): Promise<void>;
  getFlinksConnectUrl(): Promise<ConnectUrlResult>;
  ingestTransactions(input: { aggregatorToken: string }): Promise<IngestResult>;
}
