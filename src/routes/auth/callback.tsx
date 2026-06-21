import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { auth } from "@/lib/playmoney/client";
import { useI18n } from "@/lib/i18n/I18nProvider";

// IMPORTANT: Supabase project → Authentication → URL Configuration
// Site URL:      https://your-workers-subdomain.workers.dev
// Redirect URLs: https://your-workers-subdomain.workers.dev/auth/callback
//
// Supabase magic-link redirects to this route with:
//   ?token_hash=<hash>&type=email  (PKCE flow — used by default)
//   OR
//   #access_token=...&type=magiclink  (legacy implicit — not used here)
//
// This route handles the PKCE token_hash path only (Supabase JS SDK v2 default).

export const Route = createFileRoute("/auth/callback")({
  head: () => ({ meta: [{ title: "Signing you in… — PlayMoney" }] }),
  component: AuthCallback,
});

type Phase = "verifying" | "success" | "error";

function AuthCallback() {
  const nav = useNavigate();
  const [phase, setPhase] = useState<Phase>("verifying");
  const [errorMsg, setErrorMsg] = useState("");
  const { t } = useI18n();

  useEffect(() => {
    void (async () => {
      const params = new URLSearchParams(window.location.search);
      const tokenHash = params.get("token_hash") ?? "";
      const type = params.get("type") ?? "email";

      if (!tokenHash) {
        setErrorMsg(t("auth.callback.errorMissing"));
        setPhase("error");
        return;
      }

      try {
        await auth.verifyOtpHash({ tokenHash, type });
        setPhase("success");
        // Brief success display, then navigate to app.
        await new Promise((r) => setTimeout(r, 800));
        await nav({ to: "/app" });
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : t("auth.check.invalidCode"));
        setPhase("error");
      }
    })();
  }, [nav, t]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-sm text-center"
    >
      {phase === "verifying" && (
        <>
          <div
            className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-border-d"
            style={{ borderTopColor: "#F2C24B" }}
            role="status"
            aria-label={t("auth.callback.ariaVerifying")}
          />
          <h1 className="font-display mt-6 text-2xl font-semibold text-text-dark">
            {t("auth.callback.verifyingTitle")}
          </h1>
          <p className="mt-2 text-sm text-muted-dark">{t("auth.callback.verifyingSub")}</p>
        </>
      )}

      {phase === "success" && (
        <>
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-gold/20 text-3xl">
            ✓
          </span>
          <h1 className="font-display mt-6 text-2xl font-semibold text-text-dark">
            {t("auth.callback.successTitle")}
          </h1>
          <p className="mt-2 text-sm text-muted-dark">{t("auth.callback.successSub")}</p>
        </>
      )}

      {phase === "error" && (
        <>
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-gold/10 text-3xl">
            ✗
          </span>
          <h1 className="font-display mt-6 text-2xl font-semibold text-text-dark">
            {t("auth.callback.errorTitle")}
          </h1>
          <p className="mt-2 text-sm text-muted-dark">{errorMsg}</p>
          <button
            onClick={() => {
              toast.dismiss();
              void nav({ to: "/auth/sign-in" });
            }}
            className="mt-6 inline-flex h-11 items-center rounded-full bg-gold px-6 text-sm font-semibold text-ink hover:brightness-95 transition"
          >
            {t("auth.callback.requestNew")}
          </button>
        </>
      )}
    </motion.div>
  );
}
