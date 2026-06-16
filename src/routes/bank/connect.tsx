import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { auth } from "@/lib/playmoney/client";
import { PMButton } from "@/components/pm/Button";

export const Route = createFileRoute("/bank/connect")({
  head: () => ({ meta: [{ title: "Connect your bank — PlayMoney" }] }),
  component: BankConnect,
});

function BankConnect() {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleConnect() {
    setLoading(true);
    setErrorMsg("");
    try {
      // In a real flow, getFlinksConnectUrl calls the backend.
      const { connectUrl } = await auth.getFlinksConnectUrl();
      // Redirect out to the Flinks iframe/OAuth flow
      window.location.assign(connectUrl);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to generate bank link.";
      setErrorMsg(msg);
      toast.error("Connection failed", { description: msg });
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gold/10 text-3xl">
        🏦
      </div>
      <h1 className="font-display mt-6 text-3xl font-semibold">Connect your bank</h1>
      <p className="mt-3 text-muted-dark leading-relaxed">
        We use read-only access to scan your last 24 months of history for hidden money: double
        charges, unused subscriptions, and junk fees.
      </p>

      <div className="mt-8 rounded-xl border border-border-d bg-card p-6 text-left">
        <h3 className="font-semibold">Bank-level Security</h3>
        <ul className="mt-4 space-y-3 text-sm text-muted-dark">
          <li className="flex items-start gap-2">
            <span className="text-gold">✓</span>
            We cannot see or store your login credentials.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-gold">✓</span>
            We only have read-only access to transaction history.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-gold">✓</span>
            We never sell your data or use it for ads.
          </li>
        </ul>
      </div>

      <PMButton
        variant="primaryDark"
        className="mt-8 w-full"
        onClick={() => void handleConnect()}
        disabled={loading}
      >
        {loading ? "Connecting..." : "Agree & Connect"}
      </PMButton>

      {errorMsg && <p className="mt-4 text-sm text-red-500">{errorMsg}</p>}
    </div>
  );
}
