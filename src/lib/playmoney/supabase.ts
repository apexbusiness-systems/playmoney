// P1 · Real data layer behind the ApiClient / AuthClient contract.
//
// SupabaseApiClient / SupabaseAuthClient implement the same contract as the mock
// (src/lib/playmoney/types.ts) against the 0001–0006 schema. Every read/write is
// RLS-scoped to the signed-in user (auth.uid()); every row crossing the boundary
// is Zod-validated (rowTo* mappers) so a malformed/renamed column fails loudly
// instead of leaking a bad shape into the UI. Idempotency keys are honored on
// the approve path. No fund movement exists here (#1/#2) — recoveries are records,
// fees live in the separate fee_charges ledger (0004).

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  Approval,
  OccupationContext,
  type ApiClient,
  type AuthClient,
  FeeLedgerEntry,
  Notification,
  Profile,
  Recovery,
} from "./types";
import {
  processOnboarding,
  type OnboardingInput,
  type OnboardingResult,
} from "@/lib/api/onboarding.core";

// ── DB row schemas (snake_case). int8 may arrive as number or numeric string. ──
const cents = z.coerce.number().int();

const RecoveryRow = z.object({
  id: z.string(),
  merchant: z.string(),
  avenue: z.string(),
  reason: z.string(),
  gross_amount_cents: cents,
  user_net_cents: cents,
  our_fee_cents: cents,
  status: z.string(),
  idempotency_key: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});
type RecoveryRow = z.infer<typeof RecoveryRow>;

const ApprovalRow = z.object({
  id: z.string(),
  recovery_id: z.string(),
  approval_token: z.string(),
  approved_by: z.string(),
  ts: z.string(),
});
type ApprovalRow = z.infer<typeof ApprovalRow>;

const NotificationRow = z.object({
  id: z.string(),
  type: z.string(),
  recovery_id: z.string(),
  message: z.string(),
  ts: z.string(),
  read: z.boolean(),
});
type NotificationRow = z.infer<typeof NotificationRow>;

const ProfileRow = z.object({
  id: z.string(),
  display_name: z.string(),
  payout_ref: z.string().nullable(),
  user_context: z.unknown().optional(),
  created_at: z.string(),
});
type ProfileRow = z.infer<typeof ProfileRow>;

// ── Pure mappers: DB row -> validated domain model (Zod at the boundary). ──────
export function rowToRecovery(row: unknown): Recovery {
  const r = RecoveryRow.parse(row);
  return Recovery.parse({
    id: r.id,
    merchant: r.merchant,
    avenue: r.avenue,
    reason: r.reason,
    grossAmount: r.gross_amount_cents,
    userNet: r.user_net_cents,
    ourFee: r.our_fee_cents,
    status: r.status,
    idempotencyKey: r.idempotency_key,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  });
}

export function rowToApproval(row: unknown): Approval {
  const r = ApprovalRow.parse(row);
  return Approval.parse({
    id: r.id,
    recoveryId: r.recovery_id,
    approvalToken: r.approval_token,
    approvedBy: r.approved_by,
    ts: r.ts,
  });
}

export function rowToNotification(row: unknown): Notification {
  const r = NotificationRow.parse(row);
  return Notification.parse({
    id: r.id,
    type: r.type,
    recoveryId: r.recovery_id,
    message: r.message,
    ts: r.ts,
    read: r.read,
  });
}

/** Fee-ledger projection: a charged fee per landed recovery (mirrors mock semantics). */
export function recoveryToFeeEntry(rec: Recovery): FeeLedgerEntry {
  return FeeLedgerEntry.parse({
    id: `fee_${rec.id}`,
    recoveryId: rec.id,
    feeAmount: rec.ourFee,
    ts: rec.updatedAt,
  });
}

export function rowToProfile(row: unknown, email: string): Profile {
  const r = ProfileRow.parse(row);
  const rawCtx = r.user_context;
  const parsedCtx =
    rawCtx && typeof rawCtx === "object" && !Array.isArray(rawCtx) && Object.keys(rawCtx).length > 0
      ? OccupationContext.safeParse(rawCtx).data
      : undefined;
  return Profile.parse({
    id: r.id,
    displayName: r.display_name,
    email,
    payoutRef: r.payout_ref ?? "",
    // identityVerified has no column yet — verified during onboarding (P6). Until
    // then it is truthfully false rather than fabricated.
    identityVerified: false,
    createdAt: r.created_at,
    context: parsedCtx,
  });
}

/** Auth error surfaced when a passwordless sign-in emailed a magic link (no live session yet). */
export class MagicLinkSentError extends Error {
  constructor(email: string) {
    super(`A sign-in link was sent to ${email}. Confirm it to finish signing in.`);
    this.name = "MagicLinkSentError";
  }
}

function ownerScopeError(op: string): never {
  throw new Error(`${op} requires an authenticated session`);
}

export class SupabaseApiClient implements ApiClient {
  constructor(private readonly sb: SupabaseClient) {}

  private async ownerId(): Promise<string> {
    const { data, error } = await this.sb.auth.getUser();
    if (error || !data.user) ownerScopeError("ApiClient");
    return data.user.id;
  }

  async listRecoveries(): Promise<Recovery[]> {
    const { data, error } = await this.sb
      .from("recoveries")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(`listRecoveries failed: ${error.message}`);
    return (data ?? []).map(rowToRecovery);
  }

  async getRecovery(id: string): Promise<Recovery | null> {
    const { data, error } = await this.sb.from("recoveries").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(`getRecovery failed: ${error.message}`);
    return data ? rowToRecovery(data) : null;
  }

  async approveRecovery(input: { recoveryId: string; idempotencyKey: string }): Promise<Approval> {
    // P2: route through the MAN-Mode executor server fn (LOA + review + sealed-unless-LIVE).
    // The server fn handles idempotency, LOA build, review, audit trail, and DB writes.
    const { approveRecoveryFn } = await import("@/lib/api/recovery.functions");
    return approveRecoveryFn({ data: input });
  }

  async listNotifications(): Promise<Notification[]> {
    const { data, error } = await this.sb
      .from("notifications")
      .select("*")
      .order("ts", { ascending: false });
    if (error) throw new Error(`listNotifications failed: ${error.message}`);
    return (data ?? []).map(rowToNotification);
  }

  async listFeeLedger(): Promise<FeeLedgerEntry[]> {
    // Mirror the mock: one fee entry per landed recovery. The authoritative
    // causation ledger is public.fee_charges (0004), settled in P5.
    const { data, error } = await this.sb
      .from("recoveries")
      .select("*")
      .eq("status", "landed")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(`listFeeLedger failed: ${error.message}`);
    return (data ?? []).map(rowToRecovery).map(recoveryToFeeEntry);
  }

  async totals(): Promise<{ foundTotal: number; landedTotal: number; ourFeeTotal: number }> {
    const recs = await this.listRecoveries();
    const foundTotal = recs.reduce((s, r) => s + r.userNet, 0);
    const landed = recs.filter((r) => r.status === "landed");
    const landedTotal = landed.reduce((s, r) => s + r.userNet, 0);
    const ourFeeTotal = landed.reduce((s, r) => s + r.ourFee, 0);
    return { foundTotal, landedTotal, ourFeeTotal };
  }

  async exportData(): Promise<Blob> {
    const [recoveries, notifications, feeLedger] = await Promise.all([
      this.listRecoveries(),
      this.listNotifications(),
      this.listFeeLedger(),
    ]);
    return new Blob([JSON.stringify({ recoveries, notifications, feeLedger }, null, 2)], {
      type: "application/json",
    });
  }

  async deleteAllData(): Promise<void> {
    const ownerId = await this.ownerId();
    // recovery_events / approvals / notifications cascade from recoveries.
    const { error } = await this.sb.from("recoveries").delete().eq("owner_id", ownerId);
    if (error) throw new Error(`deleteAllData failed: ${error.message}`);
  }
}

export class SupabaseAuthClient implements AuthClient {
  constructor(private readonly sb: SupabaseClient) {}

  async getProfile(): Promise<Profile | null> {
    const { data: sessionData } = await this.sb.auth.getUser();
    const user = sessionData.user;
    if (!user) return null;
    const email = user.email ?? "";

    const { data, error } = await this.sb
      .from("profiles")
      .select("id, display_name, payout_ref, user_context, created_at")
      .eq("id", user.id)
      .maybeSingle();
    if (error) throw new Error(`getProfile failed: ${error.message}`);

    if (!data) {
      // First sign-in: create the tenant profile row (RLS insert_own).
      const created = await this.sb
        .from("profiles")
        .insert({ id: user.id, display_name: email.split("@")[0] || "" })
        .select("id, display_name, payout_ref, user_context, created_at")
        .single();
      if (created.error) throw new Error(`profile bootstrap failed: ${created.error.message}`);
      return rowToProfile(created.data, email);
    }
    return rowToProfile(data, email);
  }

  async signIn(input: { email: string }): Promise<Profile> {
    const email = input.email.trim();
    if (!email) throw new Error("signIn requires an email");

    // Already authenticated for this email? Return the live profile.
    const current = await this.getProfile();
    if (current && current.email.toLowerCase() === email.toLowerCase()) return current;

    // Passwordless sign-in: email a magic link, then surface a typed signal.
    const { error } = await this.sb.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (error) throw new Error(`signIn failed: ${error.message}`);
    throw new MagicLinkSentError(email);
  }

  async signOut(): Promise<void> {
    const { error } = await this.sb.auth.signOut();
    if (error) throw new Error(`signOut failed: ${error.message}`);
  }

  async saveContext(context: OccupationContext): Promise<Profile> {
    const { data: sessionData } = await this.sb.auth.getUser();
    const user = sessionData.user;
    if (!user) ownerScopeError("saveContext");
    const email = user.email ?? "";
    const { data, error } = await this.sb
      .from("profiles")
      .update({ user_context: context })
      .eq("id", user.id)
      .select("id, display_name, payout_ref, user_context, created_at")
      .single();
    if (error) throw new Error(`saveContext failed: ${error.message}`);
    return rowToProfile(data, email);
  }

  async submitOnboarding(input: OnboardingInput): Promise<OnboardingResult> {
    // Resolve the user from the live session; all writes are RLS-scoped to them.
    const { data: sessionData } = await this.sb.auth.getUser();
    const user = sessionData.user;
    if (!user) ownerScopeError("submitOnboarding");
    const userId = user.id;

    return processOnboarding({
      parsedInput: input,
      userId,
      writeAcceptance: async (agreementType, agreementVersion, contentHash) => {
        const { error } = await this.sb.from("user_acceptances").insert({
          owner_id: userId,
          agreement_type: agreementType,
          agreement_version: agreementVersion,
          content_hash: contentHash,
        });
        if (error) throw new Error(`submitOnboarding: acceptance write failed: ${error.message}`);
      },
      writePadConsent: async (consent) => {
        const { error } = await this.sb.from("pad_consents").insert({
          owner_id: userId,
          method: consent.method,
          amount_basis: consent.amountBasis,
          advance_notice_days: consent.advanceNoticeDays,
          cancellation_path: consent.cancellationPath,
          status: "active",
        });
        if (error) throw new Error(`submitOnboarding: pad_consent write failed: ${error.message}`);
      },
      updateProfile: async (displayName, payoutRef, province) => {
        const { error } = await this.sb
          .from("profiles")
          .update({
            display_name: displayName,
            payout_ref: payoutRef,
            jurisdiction_province: province,
            jurisdiction_country: input.country.toUpperCase(),
          })
          .eq("id", userId);
        if (error) throw new Error(`submitOnboarding: profile update failed: ${error.message}`);
      },
      saveContext: async (context) => {
        const { error } = await this.sb
          .from("profiles")
          .update({ user_context: context })
          .eq("id", userId);
        if (error) throw new Error(`submitOnboarding: context save failed: ${error.message}`);
      },
    });
  }

  async updateProfile(patch: Partial<Profile>): Promise<Profile> {
    const { data: sessionData } = await this.sb.auth.getUser();
    const user = sessionData.user;
    if (!user) ownerScopeError("updateProfile");
    const email = user.email ?? "";

    const dbPatch: Record<string, unknown> = {};
    if (patch.displayName !== undefined) dbPatch.display_name = patch.displayName;
    if (patch.payoutRef !== undefined) dbPatch.payout_ref = patch.payoutRef;

    const { data, error } = await this.sb
      .from("profiles")
      .update(dbPatch)
      .eq("id", user.id)
      .select("id, display_name, payout_ref, user_context, created_at")
      .single();
    if (error) throw new Error(`updateProfile failed: ${error.message}`);
    return rowToProfile(data, email);
  }
}
