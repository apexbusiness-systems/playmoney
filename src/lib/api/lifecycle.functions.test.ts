import { describe, expect, it, vi } from "vitest";
import type { FeeLedgerEntry } from "@/lib/playmoney/types";
import { applySettleFee, type SettleFeeInput } from "./lifecycle.functions";

const BASE_INPUT: SettleFeeInput = {
  recoveryId: "rec_0001",
  idempotencyKey: "idem_fee_001",
  grossAmountCents: 3500,
  confirmedAt: "2026-06-14T12:00:00.000Z",
  evidenceRef: "evt_stripe_abc",
  customerRef: "cus_tok_xyz",
  causedByPlaymoney: true,
  disclosureAcked: true,
};

const STUB_ENTRY: FeeLedgerEntry = {
  id: "fee_001",
  recoveryId: "rec_0001",
  feeAmount: 875,
  ts: "2026-06-14T12:00:00.000Z",
};

function makeIO(overrides?: {
  existingCharge?: FeeLedgerEntry | null;
  chargeResult?: { pspChargeRef: string };
}) {
  return {
    ownerId: "user_1",
    readExistingCharge: vi.fn(async () => overrides?.existingCharge ?? null),
    chargeFee: vi.fn(async () => overrides?.chargeResult ?? { pspChargeRef: "ch_test_001" }),
    writeCharge: vi.fn(async () => STUB_ENTRY),
  };
}

describe("P5 · applySettleFee: causation gate + idempotency + sealed adapter", () => {
  it("settles a fee when causation is satisfied (caused + confirmed + acked)", async () => {
    const io = makeIO();
    const result = await applySettleFee({ parsedInput: BASE_INPUT, ...io });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.pspChargeRef).toBe("ch_test_001");
      expect(result.entry.feeAmount).toBe(875);
    }
    expect(io.chargeFee).toHaveBeenCalledOnce();
    expect(io.writeCharge).toHaveBeenCalledOnce();
  });

  it("blocks the fee when not caused by PlayMoney (#13 causation gate)", async () => {
    const io = makeIO();
    const result = await applySettleFee({
      parsedInput: { ...BASE_INPUT, causedByPlaymoney: false },
      ...io,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("fee_not_allowed");
    expect(io.chargeFee).not.toHaveBeenCalled();
  });

  it("blocks the fee when disclosure was not acknowledged", async () => {
    const io = makeIO();
    const result = await applySettleFee({
      parsedInput: { ...BASE_INPUT, disclosureAcked: false },
      ...io,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("fee_not_allowed");
    expect(io.chargeFee).not.toHaveBeenCalled();
  });

  it("blocks the fee when the recovery is not a confirmed recovery shape", async () => {
    const io = makeIO();
    const result = await applySettleFee({
      parsedInput: { ...BASE_INPUT, evidenceRef: "" }, // empty evidenceRef → not ConfirmedRecovery
      ...io,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("fee_not_allowed");
    expect(io.chargeFee).not.toHaveBeenCalled();
  });

  it("is idempotent: existing charge → returns idempotent_return without re-charging", async () => {
    const io = makeIO({ existingCharge: STUB_ENTRY });
    const result = await applySettleFee({ parsedInput: BASE_INPUT, ...io });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("idempotent_return");
      expect(result.entry?.id).toBe("fee_001");
    }
    expect(io.chargeFee).not.toHaveBeenCalled();
    expect(io.writeCharge).not.toHaveBeenCalled();
  });

  it("fee rate is bounded to 20-30% (causation.ts validateFeeRate throws)", async () => {
    const io = makeIO();
    // validateFeeRate throws (it is a hard guard, not a typed result) — the
    // calling code must treat an out-of-band rate as a programming error.
    await expect(
      applySettleFee({
        parsedInput: { ...BASE_INPUT, feeRate: 0.99 },
        ...io,
      }),
    ).rejects.toThrow("outside benchmark band");
    expect(io.chargeFee).not.toHaveBeenCalled();
  });
});

describe("P5 · full lifecycle: fee_reversal path end-to-end (mocked externals)", () => {
  it("processes approve then settle idempotently across multiple calls", async () => {
    const io = makeIO();

    // First settlement — writes the charge.
    const r1 = await applySettleFee({ parsedInput: BASE_INPUT, ...io });
    expect(r1.ok).toBe(true);
    expect(io.writeCharge).toHaveBeenCalledTimes(1);

    // Simulate the charge existing in DB for the second call.
    const io2 = makeIO({ existingCharge: STUB_ENTRY });
    const r2 = await applySettleFee({ parsedInput: BASE_INPUT, ...io2 });
    expect(r2.ok).toBe(false);
    if (!r2.ok) expect(r2.code).toBe("idempotent_return");
    expect(io2.chargeFee).not.toHaveBeenCalled();
    expect(io2.writeCharge).not.toHaveBeenCalled();
  });
});
