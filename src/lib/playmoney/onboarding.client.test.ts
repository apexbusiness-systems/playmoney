import { describe, expect, it } from "vitest";
import { MockAuthClient } from "./mock";
import type { OnboardingInput } from "@/lib/api/onboarding.core";

const baseInput = (over: Partial<OnboardingInput> = {}): OnboardingInput => ({
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
  displayName: "Sam Rivera",
  payoutRef: "tok_payout_abc",
  ...over,
});

describe("P6 · MockAuthClient.submitOnboarding (contract seam)", () => {
  it("records consent for an eligible (Alberta) user and persists payout + name", async () => {
    const auth = new MockAuthClient();
    const res = await auth.submitOnboarding(baseInput());
    expect(res.ok).toBe(true);
    const profile = await auth.getProfile();
    expect(profile?.displayName).toBe("Sam Rivera");
    expect(profile?.payoutRef).toBe("tok_payout_abc");
  });

  it("persists occupation context when supplied", async () => {
    const auth = new MockAuthClient();
    await auth.submitOnboarding(
      baseInput({
        occupationContext: {
          occupationType: "gig_worker",
          platforms: ["Uber"],
          priorityAvenueHints: [],
        },
      }),
    );
    const profile = await auth.getProfile();
    expect(profile?.context?.occupationType).toBe("gig_worker");
  });

  it("blocks a non-Alberta jurisdiction (geofence #8) without persisting", async () => {
    const auth = new MockAuthClient();
    const res = await auth.submitOnboarding(
      baseInput({ province: "ON", displayName: "Blocked User" }),
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("jurisdiction_blocked");
    const profile = await auth.getProfile();
    expect(profile?.displayName).not.toBe("Blocked User");
  });
});
