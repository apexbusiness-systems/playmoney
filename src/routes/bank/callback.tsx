import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { auth } from "@/lib/playmoney/client";
import { useI18n } from "@/lib/i18n/I18nProvider";

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
  const navTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { t } = useI18n();

  useEffect(() => {
    void (async () => {
      if (error) {
        setStatus("error");
        toast.error(t("bank.callback.toastFailed"), {
          description: t("bank.callback.toastDenied"),
        });
        return;
      }
      if (!loginId) {
        setStatus("error");
        toast.error(t("bank.callback.toastInvalid"));
        return;
      }

      try {
        // Kick off ingestion using the returned aggregator token (loginId in Flinks terms).
        const result = await auth.ingestTransactions({ aggregatorToken: loginId });

        if (!result.ok) {
          // Honest sealed-until-live state — no real scan happened.
          setStatus("done");
          toast.info(t("bank.callback.toastComingSoon"), { description: result.message });
          navTimerRef.current = setTimeout(() => {
            void nav({ to: "/app" });
          }, 1800);
          return;
        }

        // Persist the aggregator OAuth token (read-only access) for future scans.
        // Only reached when ingest actually ran (LIVE) — sealed BUILT never lands here.
        await auth.saveAdapterRefs({ aggregatorToken: loginId });

        setStatus("done");

        toast.success(t("bank.callback.toastScanComplete"), {
          description: t("bank.callback.toastFoundCount", { count: result.situationCount }),
        });

        // Slight delay for UX, then return to dashboard to view the pipeline.
        navTimerRef.current = setTimeout(() => {
          void nav({ to: "/app" });
        }, 1500);
      } catch (err) {
        setStatus("error");
        toast.error(t("bank.callback.toastScanFailed"), {
          description: err instanceof Error ? err.message : t("bank.callback.toastScanFailedDesc"),
        });
      }
    })();
    return () => {
      if (navTimerRef.current !== null) clearTimeout(navTimerRef.current);
    };
  }, [loginId, error, nav, t]);

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
            {t("bank.callback.scanningTitle")}
          </h1>
          <p className="mt-2 text-sm text-muted-dark">{t("bank.callback.scanningDesc")}</p>
        </>
      )}

      {status === "done" && (
        <>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gold/20 text-3xl">
            ✓
          </div>
          <h1 className="font-display mt-6 text-2xl font-semibold">
            {t("bank.callback.successTitle")}
          </h1>
          <p className="mt-2 text-sm text-muted-dark">{t("bank.callback.successSub")}</p>
        </>
      )}

      {status === "error" && (
        <>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/20 text-3xl">
            ✗
          </div>
          <h1 className="font-display mt-6 text-2xl font-semibold">
            {t("bank.callback.failedTitle")}
          </h1>
          <p className="mt-2 text-sm text-muted-dark">{t("bank.callback.failedSub")}</p>
          <button
            onClick={() => void nav({ to: "/bank/connect" })}
            className="mt-6 text-sm font-semibold text-gold hover:underline"
          >
            {t("bank.callback.tryAgain")}
          </button>
        </>
      )}
    </div>
  );
}
