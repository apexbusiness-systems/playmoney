import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MagicLinkSentError,
  SupabaseApiClient,
  SupabaseAuthClient,
  buildAdapterRefPatch,
  deriveInitiatedRecovery,
  processInitiateRecovery,
  recoveryToFeeEntry,
  rowToApproval,
  rowToNotification,
  rowToProfile,
  rowToRecovery,
} from "./supabase";
import type { ApiClient, AuthClient } from "./types";
import type { DetectedSituation } from "@/lib/engine/situation";

// Compile-time proof the real clients satisfy the contract (no `any`, no drift).
const _api: new (sb: never) => ApiClient = SupabaseApiClient;
const _auth: new (sb: never) => AuthClient = SupabaseAuthClient;
void _api;
void _auth;

describe("P1 · DB row -> domain mappers are Zod-validated at the boundary", () => {
  const recRow = {
    id: "11111111-1111-1111-1111-111111111111",
    merchant: "Chase Checking",
    avenue: "fee_reversal",
    reason: "Overdraft fee reversed",
    gross_amount_cents: 3500,
    user_net_cents: 2800,
    our_fee_cents: 700,
    status: "landed",
    idempotency_key: "idem_chase",
    created_at: "2026-06-13T12:00:00.000Z",
    updated_at: "2026-06-13T12:00:00.000Z",
  };

  it("maps a recovery row, coercing int8-as-string cents to integers", () => {
    const rec = rowToRecovery({ ...recRow, gross_amount_cents: "3500" });
    expect(rec.grossAmount).toBe(3500);
    expect(rec.merchant).toBe("Chase Checking");
    expect(rec.avenue).toBe("fee_reversal");
    expect(rec.idempotencyKey).toBe("idem_chase");
  });

  it("rejects a row with an out-of-contract avenue/status (fails loud)", () => {
    expect(() => rowToRecovery({ ...recRow, avenue: "insurance_claim" })).toThrow();
    expect(() => rowToRecovery({ ...recRow, status: "settled" })).toThrow();
  });

  it("maps approval + notification rows", () => {
    const apr = rowToApproval({
      id: "a1",
      recovery_id: recRow.id,
      approval_token: "tok",
      approved_by: "user-1",
      ts: "2026-06-14T00:00:00.000Z",
    });
    expect(apr.approvalToken).toBe("tok");

    const ntf = rowToNotification({
      id: "n1",
      type: "money_landed",
      recovery_id: recRow.id,
      message: "$28 landed",
      ts: "2026-06-14T00:00:00.000Z",
      read: false,
    });
    expect(ntf.type).toBe("money_landed");
  });

  it("rejects a non-money notification type (#16 at the boundary)", () => {
    expect(() =>
      rowToNotification({
        id: "n2",
        type: "marketing",
        recovery_id: recRow.id,
        message: "buy now",
        ts: "2026-06-14T00:00:00.000Z",
        read: false,
      }),
    ).toThrow();
  });

  it("projects a fee-ledger entry from a landed recovery", () => {
    const fee = recoveryToFeeEntry(rowToRecovery(recRow));
    expect(fee.feeAmount).toBe(700);
    expect(fee.recoveryId).toBe(recRow.id);
  });

  it("maps a profile row + session email; identity is truthfully false pre-onboarding", () => {
    const prof = rowToProfile(
      {
        id: "user-1",
        display_name: "Maya",
        payout_ref: null,
        created_at: "2026-05-01T00:00:00.000Z",
      },
      "maya@example.com",
    );
    expect(prof.email).toBe("maya@example.com");
    expect(prof.payoutRef).toBe("");
    expect(prof.identityVerified).toBe(false);
  });
});

describe("T3 · initiateRecovery creates a real recovery row + initiated audit event", () => {
  const situation: DetectedSituation = {
    situation: {
      id: "sit_001",
      merchant: "Chase Checking",
      detectedAt: "2026-06-12T12:00:00Z",
      summary: "Overdraft fee charged on May 12th",
    },
    problemType: "fee_reversal",
    merchant: "Chase Checking",
    amountCents: 3500,
    evidenceTxnIds: ["txn_1"],
  };

  it("projects an owner-scoped row with integer cents and a 25% fee", () => {
    const row = deriveInitiatedRecovery(situation, "owner-1");
    expect(row.owner_id).toBe("owner-1");
    expect(row.merchant).toBe("Chase Checking");
    expect(row.avenue).toBe("fee_reversal");
    expect(row.gross_amount_cents).toBe(3500);
    expect(row.our_fee_cents).toBe(875); // 25%
    expect(row.user_net_cents).toBe(2625); // gross - fee, integer cents
    expect(row.status).toBe("needs_approval");
    expect(row.idempotency_key).toBe("init_sit_001");
  });

  it("inserts the recovery, writes the initiated event, and returns the generated id", async () => {
    const inserted: unknown[] = [];
    const events: string[] = [];
    const result = await processInitiateRecovery({
      situation,
      ownerId: "owner-1",
      insertRecovery: async (row) => {
        inserted.push(row);
        return { id: "rec-uuid-generated" };
      },
      writeEvent: async (recoveryId) => {
        events.push(recoveryId);
      },
    });

    expect(result.recoveryId).toBe("rec-uuid-generated");
    expect(inserted).toHaveLength(1);
    expect(events).toEqual(["rec-uuid-generated"]); // audit event written for the new row
  });

  it("no longer throws the not-implemented stub error", () => {
    // The throwing stub has been replaced by a real, injectable implementation.
    expect(SupabaseApiClient.prototype.initiateRecovery.toString()).not.toContain(
      "not implemented",
    );
  });
});

describe("T5 · adapter-ref patch is owner-scoped, partial-safe, and money-free", () => {
  it("maps camelCase refs to snake_case profile columns", () => {
    const patch = buildAdapterRefPatch({
      stripeCustomerRef: "cus_123",
      aggregatorToken: "tok_flinks_abc",
    });
    expect(patch).toEqual({
      stripe_customer_ref: "cus_123",
      aggregator_token: "tok_flinks_abc",
    });
  });

  it("skips undefined fields so a partial save never nulls the other ref", () => {
    expect(buildAdapterRefPatch({ stripeCustomerRef: "cus_only" })).toEqual({
      stripe_customer_ref: "cus_only",
    });
    expect(buildAdapterRefPatch({ aggregatorToken: "tok_only" })).toEqual({
      aggregator_token: "tok_only",
    });
    expect(buildAdapterRefPatch({})).toEqual({});
  });
});

describe("P1 · Supabase passwordless sign-in is code-first", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends an OTP email and keeps action-link fallbacks on the code-entry route", async () => {
    const signInWithOtp = vi.fn().mockResolvedValue({ error: null });
    const sb = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
        signInWithOtp,
      },
    } as never;
    vi.stubGlobal("window", { location: { origin: "https://playmoney.example" } });

    await expect(
      new SupabaseAuthClient(sb).signIn({ email: "Maya@Example.com " }),
    ).rejects.toBeInstanceOf(MagicLinkSentError);

    expect(signInWithOtp).toHaveBeenCalledWith({
      email: "Maya@Example.com",
      options: {
        shouldCreateUser: true,
        emailRedirectTo: "https://playmoney.example/auth/check-email?email=Maya%40Example.com",
      },
    });
  });
});

describe("P1 · MagicLinkSentError is a typed, named signal", () => {
  it("names the email and the type", () => {
    const e = new MagicLinkSentError("maya@example.com");
    expect(e.name).toBe("MagicLinkSentError");
    expect(e.message).toContain("maya@example.com");
  });
});
