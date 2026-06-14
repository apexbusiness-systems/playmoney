import { z } from "zod";

export const RecoveryStatus = z.enum([
  "found",
  "needs_approval",
  "on_the_way",
  "landed",
]);
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

export interface ApiClient {
  listRecoveries(): Promise<Recovery[]>;
  getRecovery(id: string): Promise<Recovery | null>;
  approveRecovery(input: {
    recoveryId: string;
    idempotencyKey: string;
  }): Promise<Approval>;
  listNotifications(): Promise<Notification[]>;
  listFeeLedger(): Promise<FeeLedgerEntry[]>;
  totals(): Promise<{ foundTotal: number; landedTotal: number; ourFeeTotal: number }>;
  exportData(): Promise<Blob>;
  deleteAllData(): Promise<void>;
}

export interface AuthClient {
  getProfile(): Promise<Profile | null>;
  signIn(input: { email: string }): Promise<Profile>;
  signOut(): Promise<void>;
  updateProfile(patch: Partial<Profile>): Promise<Profile>;
}