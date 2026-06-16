import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { auth } from "@/lib/playmoney/client";

const searchSchema = (search: Record<string, unknown>) => {
  return {
    loginId: typeof search.loginId === "string" ? search.loginId : undefined,
    error: typeof search.error === "string" ? search.error : undefined,
  };
};

export const Route = createFileRoute("/bank/callback")({
  head: () => ({ meta: [{ title: "Scanning... — PlayMoney" }] }),
  validateSearch: searchSchema,
  component: BankCallback,
});

function BankCallback() {
  const { loginId, error } = Route.useSearch();
  const nav = useNavigate();
  const [status, setStatus] = useState<"scanning" | "done" | "error">("scanning");

  useEffect(() => {
    void (async () => {
      if (error) {
        setStatus("error");
        toast.error("Connection failed", {
          description: "You cancelled or the bank denied access.",
        });
        return;
      }
      if (!loginId) {
        setStatus("error");
        toast.error("Invalid response from bank");
        return;
      }

      try {
        // Kick off ingestion using the returned aggregator token (loginId in Flinks terms).
        const { success, situationCount } = await auth.ingestTransactions({
          aggregatorToken: loginId,
        });
        if (!success) throw new Error("Ingestion pipeline failed");

        setStatus("done");

        toast.success("Scan complete", {
          description: `We found ${situationCount} potential refunds in your history.`,
        });

        // Slight delay for UX, then return to dashboard to view the pipeline.
        setTimeout(() => {
          void nav({ to: "/app" });
        }, 1500);
      } catch (err) {
        setStatus("error");
        toast.error("Scanning failed", {
          description: err instanceof Error ? err.message : "Could not process your history.",
        });
      }
    })();
  }, [loginId, error, nav]);

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      {status === "scanning" && (
        <>
          <div
            className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-border-d"
            style={{ borderTopColor: "#F2C24B" }}
            role="status"
          />
          <h1 className="font-display mt-6 text-2xl font-semibold">
            Scanning 24 months of history...
          </h1>
          <p className="mt-2 text-sm text-muted-dark">
            Looking for unused subscriptions, duplicate charges, and hidden fees. This usually takes
            about 10 seconds.
          </p>
        </>
      )}

      {status === "done" && (
        <>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gold/20 text-3xl">
            ✓
          </div>
          <h1 className="font-display mt-6 text-2xl font-semibold">Scan complete</h1>
          <p className="mt-2 text-sm text-muted-dark">Taking you to your dashboard...</p>
        </>
      )}

      {status === "error" && (
        <>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/20 text-3xl">
            ✗
          </div>
          <h1 className="font-display mt-6 text-2xl font-semibold">Scan failed</h1>
          <p className="mt-2 text-sm text-muted-dark">We couldn't connect to your bank.</p>
          <button
            onClick={() => void nav({ to: "/bank/connect" })}
            className="mt-6 text-sm font-semibold text-gold hover:underline"
          >
            Try again
          </button>
        </>
      )}
    </div>
  );
}
