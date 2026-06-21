import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const setupCustomerFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ email: z.string().email(), name: z.string() }))
  .handler(async ({ data }) => {
    // P4: Load the adapter from the port factory. The factory honors BUILT mode seals.
    const { createPayoutAdapter } = await import("@/lib/adapters/payout");
    // We pass undefined config to trigger the stub or allow an injected env if we had one.
    // Real implementation would pull STRIPE_SECRET_KEY from env.server.ts.
    // For now, in BUILT mode, calling createStripeCustomer() on the returned port throws
    // a LiveModeBlockedError (or "Not configured" if not seeded).
    const port = createPayoutAdapter({ stripeSecretKey: process.env.STRIPE_SECRET_KEY });

    // Attempt the setup call (this hits the mode seal — sealed in BUILT). The issued
    // customerRef is persisted to profiles.stripe_customer_ref by the caller via the
    // RLS-session seam (auth.saveAdapterRefs), since this server fn has no session
    // context and recovery_events/profiles writes must stay owner-scoped (#15).
    const { customerRef } = await port.createStripeCustomer(data);
    return { success: true, customerRef };
  });
