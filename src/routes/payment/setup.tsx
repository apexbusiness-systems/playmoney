import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { auth } from "@/lib/playmoney/client";
import { PMButton } from "@/components/pm/Button";
import { setupCustomerFn } from "@/lib/api/payment.functions";

export const Route = createFileRoute("/payment/setup")({
  head: () => ({ meta: [{ title: "Payment Setup — PlayMoney" }] }),
  component: PaymentSetup,
});

function PaymentSetup() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);

  async function handleSetup() {
    setLoading(true);
    try {
      const profile = await auth.getProfile();
      if (!profile) throw new Error("Not authenticated");

      // In real life this would redirect to Stripe Checkout in "setup" mode,
      // but here we hit our server function that hits the PayoutPort.
      const res = await setupCustomerFn({
        data: { email: profile.email, name: profile.displayName },
      });

      // Persist the issued Stripe CUSTOMER ref to its own column (not payout_ref —
      // the customer id is who we charge the fee to, not where the user's money lands).
      if (res.success && res.customerRef) {
        await auth.saveAdapterRefs({ stripeCustomerRef: res.customerRef });
        toast.success("Payment method secured");
        await nav({ to: "/app" });
      }
    } catch (err) {
      toast.error("Setup blocked", {
        description: err instanceof Error ? err.message : "Payment setup failed.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gold/10 text-3xl">
        💳
      </div>
      <h1 className="font-display mt-6 text-3xl font-semibold">Secure your fee payment</h1>
      <p className="mt-3 text-muted-dark leading-relaxed">
        We found money that belongs to you. PlayMoney takes a 20% success fee{" "}
        <strong>only after</strong> the funds land safely in your account.
      </p>

      <div className="mt-8 rounded-xl border border-border-d bg-card p-6 text-left">
        <h3 className="font-semibold text-gold">Our Promise</h3>
        <ul className="mt-4 space-y-3 text-sm text-muted-dark">
          <li className="flex items-start gap-2">
            <span className="text-gold">✓</span>
            No upfront costs.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-gold">✓</span>
            You approve every recovery.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-gold">✓</span>
            We only get paid when you do.
          </li>
        </ul>
      </div>

      <PMButton
        variant="primaryDark"
        className="mt-8 w-full"
        onClick={() => void handleSetup()}
        disabled={loading}
      >
        {loading ? "Securing..." : "Add Payment Method"}
      </PMButton>
      <p className="mt-4 text-xs text-muted-dark">Secured by Stripe</p>
    </div>
  );
}
