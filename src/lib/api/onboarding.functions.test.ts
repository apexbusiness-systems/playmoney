import { describe, expect, it, vi } from "vitest";
import { processOnboarding, type OnboardingInput } from "./onboarding.functions";

const BASE_INPUT: OnboardingInput = {
  country: "CA",
  province: "AB",
  tosVersion: "1.0",
  tosContentHash: "sha256_tos_v1",
  privacyVersion: "1.0",
  privacyContentHash: "sha256_priv_v1",
  padMethod: "card_on_file",
  padAmountBasis: "25% of recovered amount, charged after successful recovery",
  padAdvanceNoticeDays: 0,
  padCancellationPath: "Email cancel@playmoney.app or call 1-800-PLAYMONEY",
  padWaiveAdvanceNotice: false,
  displayName: "Maya Chen",
  payoutRef: "tok_payout_***z29x",
};

function makeIO() {
  return {
    userId: "user_1",
    writeAcceptance: vi.fn(async () => undefined),
    writePadConsent: vi.fn(async () => undefined),
    updateProfile: vi.fn(async () => undefined),
  };
}

describe("P6 · processOnboarding: consent records written, gates satisfied", () => {
  it("writes ToS, Privacy, and PAD consent for an Alberta user", async () => {
    const io = makeIO();
    const result = await processOnboarding({ parsedInput: BASE_INPUT, ...io });
    expect(result.ok).toBe(true);
    expect(io.writeAcceptance).toHaveBeenCalledTimes(2);
    expect(io.writeAcceptance).toHaveBeenCalledWith("tos", "1.0", "sha256_tos_v1");
    expect(io.writeAcceptance).toHaveBeenCalledWith("privacy", "1.0", "sha256_priv_v1");
    expect(io.writePadConsent).toHaveBeenCalledTimes(1);
    expect(io.updateProfile).toHaveBeenCalledWith("Maya Chen", "tok_payout_***z29x", "AB");
  });

  it("rejects a user outside Alberta (geofence #8)", async () => {
    const io = makeIO();
    const result = await processOnboarding({
      parsedInput: { ...BASE_INPUT, country: "US", province: null },
      ...io,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("jurisdiction_blocked");
    expect(io.writeAcceptance).not.toHaveBeenCalled();
    expect(io.writePadConsent).not.toHaveBeenCalled();
  });

  it("rejects a Quebec user (separate gated project)", async () => {
    const io = makeIO();
    const result = await processOnboarding({
      parsedInput: { ...BASE_INPUT, province: "QC" },
      ...io,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("jurisdiction_blocked");
  });

  it("rejects PAD consent without Rule H1 advance notice (not waived)", async () => {
    const io = makeIO();
    await expect(
      processOnboarding({
        parsedInput: {
          ...BASE_INPUT,
          padMethod: "pad",
          padAdvanceNoticeDays: 3, // below 10-day minimum (#12)
          padWaiveAdvanceNotice: false,
        },
        ...io,
      }),
    ).rejects.toThrow("advance notice");
    expect(io.writePadConsent).not.toHaveBeenCalled();
  });

  it("accepts PAD consent when advance notice waived", async () => {
    const io = makeIO();
    const result = await processOnboarding({
      parsedInput: { ...BASE_INPUT, padMethod: "pad", padAdvanceNoticeDays: 0, padWaiveAdvanceNotice: true },
      ...io,
    });
    expect(result.ok).toBe(true);
    expect(io.writePadConsent).toHaveBeenCalledTimes(1);
  });
});
