// P4 · PayoutPort adapter — Stripe fee-only merchant charge.
//
// PlayMoney is the MERCHANT charging the user a fee via Stripe. There is
// deliberately no method here that moves, holds, or routes a user's recovered
// funds (#1/#2/#4). The fee is a separate PSP charge, never netted from a
// recovery payout. The adapter is sealed in BUILT: assertLiveAllowed() throws
// before any Stripe API call is made.

import type { PayoutPort } from "@/lib/compliance/ports";
import { assertLiveAllowed } from "@/lib/compliance/mode";
import { loadGateStatus } from "@/lib/compliance/gates.server";

interface StripeChargeResponse {
  id: string;
  status: string;
  amount: number;
}

interface StripeErrorResponse {
  error?: { message?: string };
}

export class StripePayoutAdapter implements PayoutPort {
  constructor(private readonly secretKey: string) {}

  async chargeFee(input: {
    feeCents: number;
    customerRef: string;
    idempotencyKey: string;
  }): Promise<{ pspChargeRef: string }> {
    const gates = await loadGateStatus();
    assertLiveAllowed(gates); // throws LiveModeBlockedError in BUILT

    const body = new URLSearchParams({
      amount: String(input.feeCents),
      currency: "cad",
      customer: input.customerRef,
      description: "PlayMoney recovery fee",
    });

    const res = await fetch("https://api.stripe.com/v1/charges", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Idempotency-Key": input.idempotencyKey,
      },
      body,
    });

    if (!res.ok) {
      const err = (await res.json()) as StripeErrorResponse;
      throw new Error(
        `StripePayoutAdapter.chargeFee: ${err.error?.message ?? `HTTP ${res.status}`}`,
      );
    }

    const charge = (await res.json()) as StripeChargeResponse;
    return { pspChargeRef: charge.id };
  }
}

/** Sealed stub: in BUILT assertLiveAllowed throws before any real call. */
export function createPayoutAdapter(config: { stripeSecretKey?: string }): PayoutPort {
  if (config.stripeSecretKey) {
    return new StripePayoutAdapter(config.stripeSecretKey);
  }
  return {
    async chargeFee() {
      const gates = await loadGateStatus();
      assertLiveAllowed(gates);
      throw new Error("No PayoutPort adapter configured");
    },
  };
}
