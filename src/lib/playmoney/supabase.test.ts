import { describe, expect, it } from "vitest";
import {
  MagicLinkSentError,
  SupabaseApiClient,
  SupabaseAuthClient,
  recoveryToFeeEntry,
  rowToApproval,
  rowToNotification,
  rowToProfile,
  rowToRecovery,
} from "./supabase";
import type { ApiClient, AuthClient } from "./types";

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

describe("P1 · MagicLinkSentError is a typed, named signal", () => {
  it("names the email and the type", () => {
    const e = new MagicLinkSentError("maya@example.com");
    expect(e.name).toBe("MagicLinkSentError");
    expect(e.message).toContain("maya@example.com");
  });
});
