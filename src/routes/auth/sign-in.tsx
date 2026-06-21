import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { auth } from "@/lib/playmoney/client";
import { MagicLinkSentError } from "@/lib/playmoney/supabase";
import { PMButton } from "@/components/pm/Button";
import { useI18n } from "@/lib/i18n/I18nProvider";

export const Route = createFileRoute("/auth/sign-in")({
  head: () => ({ meta: [{ title: "Sign in — PlayMoney" }] }),
  component: SignIn,
});

function SignIn() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  const { t } = useI18n();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;
    setLoading(true);
    try {
      // signIn returns Profile when already authenticated (mock, or existing Supabase session).
      await auth.signIn({ email: trimmed });
      // Got a profile — session is live → go directly to app.
      await nav({ to: "/app" });
    } catch (err) {
      if (err instanceof MagicLinkSentError) {
        // Expected path: Supabase sent a magic link → show check-email screen.
        await nav({
          to: "/auth/check-email",
          search: { email: trimmed },
        });
        return;
      }
      toast.error(t("auth.signin.errorToast"), {
        description: err instanceof Error ? err.message : t("auth.signin.tryAgain"),
      });
    } finally {
      setLoading(false);
    }
  }

  // Create footer link text with formatting
  const linkMarkup = (
    <a href="/" className="underline hover:text-text-dark">
      {t("auth.signin.footerLinkText")}
    </a>
  );
  const footerTemplate = t("auth.signin.footer");
  const footerParts = footerTemplate.split("{link}");

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-sm"
    >
      <h1 className="font-display text-center text-3xl font-semibold text-text-dark">
        {t("auth.signin.title")}
      </h1>
      <p className="mt-2 text-center text-sm text-muted-dark">{t("auth.signin.subtitle")}</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label htmlFor="signin-email" className="eyebrow block text-muted-dark">
            {t("auth.signin.emailLabel")}
          </label>
          <input
            id="signin-email"
            type="email"
            autoComplete="email"
            autoFocus
            required
            placeholder={t("auth.signin.placeholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className="mt-1.5 h-12 w-full rounded-[12px] border border-border-d bg-evergreen/40 px-4 text-text-dark placeholder:text-muted-dark/60 focus-visible:border-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-50"
          />
        </div>

        <PMButton
          type="submit"
          variant="primaryDark"
          className="w-full"
          disabled={loading || !email.trim()}
        >
          {loading ? t("auth.signin.btnSending") : t("auth.signin.btnSend")}
        </PMButton>
      </form>

      <p className="mt-6 text-center text-xs text-muted-dark">
        {footerParts[0]}
        {linkMarkup}
        {footerParts[1]}
      </p>
    </motion.div>
  );
}
