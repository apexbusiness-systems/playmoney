import { afterEach, describe, expect, it, vi } from "vitest";
import type { Recovery } from "@/lib/playmoney/types";
import { GATE_KEYS, type GateStatus } from "@/lib/compliance/gates";
import { processApproval, buildApprovalLoa } from "./recovery.functions";

const ALL_GREEN: GateStatus = Object.fromEntries(GATE_KEYS.map((k) => [k, true])) as GateStatus;
const NO_GATES: Partial<GateStatus> = {};

const baseRecovery: Recovery = {
  id: "rec_0004",
  merchant: "Delta Airlines",
  avenue: "refund",
  reason: "Delay compensation",
  grossAmount: 24000,
  userNet: 19200,
  ourFee: 4800,
  status: "needs_approval",
  idempotencyKey: "idem_delta",
  createdAt: "2026-06-13T10:00:00.000Z",
  updatedAt: "2026-06-13T10:00:00.000Z",
};

const NOW = new Date("2026-06-14T12:00:00.000Z");

afterEach(() => {
  delete process.env.PLAYMONEY_MODE;
});

describe("P2 · processApproval: perform() is never called in BUILT mode", () => {
  it("seals the action in BUILT even when LOA + review are valid and all gates green", async () => {
    const perform = vi.fn(async () => undefined);
    const outcome = await processApproval({
      recovery: baseRecovery,
      userId: "user_1",
      recoveryId: "rec_0004",
      idempotencyKey: "idem_delta",
      gateStatus: ALL_GREEN,
      now: NOW,
      perform,
    });
    expect(outcome.status).toBe("sealed");
    expect(perform).not.toHaveBeenCalled();
  });

  it("seals when LIVE but gates are unmet (e.g. G-counsel red)", async () => {
    process.env.PLAYMONEY_MODE = "LIVE";
    const perform = vi.fn(async () => undefined);
    const outcome = await processApproval({
      recovery: baseRecovery,
      userId: "user_1",
      recoveryId: "rec_0004",
      idempotencyKey: "idem_delta",
      gateStatus: { ...ALL_GREEN, "G-counsel": false },
      now: NOW,
      perform,
    });
    expect(outcome.status).toBe("sealed");
    expect(perform).not.toHaveBeenCalled();
  });

  it("executes perform() ONLY when LIVE + every gate is green", async () => {
    process.env.PLAYMONEY_MODE = "LIVE";
    const perform = vi.fn(async () => undefined);
    const outcome = await processApproval({
      recovery: baseRecovery,
      userId: "user_1",
      recoveryId: "rec_0004",
      idempotencyKey: "idem_delta",
      gateStatus: ALL_GREEN,
      now: NOW,
      perform,
    });
    expect(outcome.status).toBe("executed");
    expect(perform).toHaveBeenCalledTimes(1);
  });

  it("seals with no gate status at all (BUILT default)", async () => {
    const perform = vi.fn(async () => undefined);
    const outcome = await processApproval({
      recovery: baseRecovery,
      userId: "user_1",
      recoveryId: "rec_0004",
      idempotencyKey: "idem_delta",
      gateStatus: NO_GATES,
      now: NOW,
      perform,
    });
    expect(outcome.status).toBe("sealed");
    expect(perform).not.toHaveBeenCalled();
  });

  it("works across all enabled RecoveryAvenue problem types (no disabled-avenue reject)", async () => {
    const avenues = ["refund", "fee_reversal", "subscription", "billing_error", "double_charge"] as const;
    for (const avenue of avenues) {
      const perform = vi.fn(async () => undefined);
      const outcome = await processApproval({
        recovery: { ...baseRecovery, avenue },
        userId: "user_1",
        recoveryId: "rec_0004",
        idempotencyKey: `idem_${avenue}`,
        gateStatus: ALL_GREEN,
        now: NOW,
        perform,
      });
      // In BUILT, all should seal — never reject due to avenue being disabled.
      expect(outcome.status, `expected sealed for avenue=${avenue}`).toBe("sealed");
    }
  });
});

describe("P2 · buildApprovalLoa: e-LOA shape from click_accept", () => {
  it("produces a valid, active LOA scoped to the recovery's avenue/merchant/amount", () => {
    const loa = buildApprovalLoa({
      userId: "user_1",
      recoveryId: "rec_0004",
      recovery: baseRecovery,
      idempotencyKey: "idem_delta",
      now: NOW,
    });
    expect(loa.status).toBe("active");
    expect(loa.signature.method).toBe("click_accept");
    expect(loa.signature.consentElectronic).toBe(true);
    expect(loa.scope.avenue).toBe("merchant_refund"); // refund → merchant_refund
    expect(loa.scope.merchant).toBe("Delta Airlines");
    expect(loa.scope.maxAmountCents).toBe(24000);
    expect(new Date(loa.expiresAt).getTime()).toBeGreaterThan(NOW.getTime());
  });

  it("maps each problem type to an enabled administrative avenue", () => {
    const cases: Array<[Recovery["avenue"], string]> = [
      ["refund", "merchant_refund"],
      ["fee_reversal", "fee_reversal"],
      ["subscription", "subscription_cancellation"],
      ["billing_error", "billing_error_correction"],
      ["double_charge", "billing_error_correction"],
    ];
    for (const [avenue, expectedKey] of cases) {
      const loa = buildApprovalLoa({
        userId: "u",
        recoveryId: "r",
        recovery: { ...baseRecovery, avenue },
        idempotencyKey: "idem",
        now: NOW,
      });
      expect(loa.scope.avenue).toBe(expectedKey);
    }
  });
});
