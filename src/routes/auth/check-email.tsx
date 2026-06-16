import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { z } from "zod";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { auth } from "@/lib/playmoney/client";
import { PMButton } from "@/components/pm/Button";

const searchSchema = z.object({
  email: z.string().email().catch(""),
});

export const Route = createFileRoute("/auth/check-email")({
  head: () => ({ meta: [{ title: "Check your inbox — PlayMoney" }] }),
  validateSearch: searchSchema,
  component: CheckEmail,
});

const RESEND_COOLDOWN_SECONDS = 60;

function CheckEmail() {
  const { email } = Route.useSearch();
  const nav = useNavigate();
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Countdown timer for the resend cooldown.
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const handleVerify = useCallback(
    async (code: string) => {
      const trimmed = code.replace(/\s/g, "");
      if (trimmed.length !== 6 || !email) return;
      setVerifying(true);
      try {
        await auth.verifyOtp({ email, token: trimmed });
        toast.success("You're in!", { description: "Welcome to PlayMoney." });
        await nav({ to: "/app" });
      } catch (err) {
        toast.error("Invalid or expired code", {
          description:
            err instanceof Error ? err.message : "Please try again or request a new link.",
        });
        setOtp("");
      } finally {
        setVerifying(false);
      }
    },
    [email, nav],
  );

  // Auto-verify when 6 digits are entered.
  useEffect(() => {
    if (otp.replace(/\s/g, "").length === 6) {
      void handleVerify(otp);
    }
  }, [otp, handleVerify]);

  async function handleResend() {
    if (!email || cooldown > 0 || resending) return;
    setResending(true);
    try {
      await auth.signIn({ email });
    } catch {
      // Suppress MagicLinkSentError — that's the expected path.
    } finally {
      setResending(false);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      toast.success("New link sent", { description: `Check ${email} for a fresh code.` });
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-sm text-center"
    >
      {/* Envelope icon */}
      <span
        aria-hidden
        className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-gold/20 text-3xl"
      >
        ✉️
      </span>

      <h1 className="font-display mt-6 text-3xl font-semibold text-text-dark">Check your inbox</h1>
      <p className="mt-2 text-sm text-muted-dark">
        We sent a sign-in link to{" "}
        <span className="font-semibold text-text-dark">{email || "your email"}</span>. Click the
        link or enter the 6-digit code below.
      </p>

      <div className="mt-8">
        <label htmlFor="otp-input" className="eyebrow block text-muted-dark">
          6-digit code
        </label>
        <input
          id="otp-input"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          maxLength={6}
          placeholder="123456"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
          disabled={verifying}
          className="mt-2 h-14 w-full rounded-[12px] border border-border-d bg-evergreen/40 px-4 text-center font-display text-2xl tracking-[0.3em] text-text-dark placeholder:text-muted-dark/40 focus-visible:border-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-50"
          aria-describedby="otp-hint"
        />
        <p id="otp-hint" className="mt-1 text-xs text-muted-dark">
          Auto-submits when complete.
        </p>
      </div>

      <PMButton
        variant="primaryDark"
        className="mt-4 w-full"
        disabled={otp.replace(/\s/g, "").length !== 6 || verifying}
        onClick={() => void handleVerify(otp)}
      >
        {verifying ? "Verifying…" : "Verify code"}
      </PMButton>

      <div className="mt-6 flex flex-col gap-2">
        <button
          onClick={() => void handleResend()}
          disabled={cooldown > 0 || resending}
          className="text-sm text-muted-dark transition hover:text-text-dark disabled:opacity-50"
        >
          {resending
            ? "Sending…"
            : cooldown > 0
              ? `Resend link in ${cooldown}s`
              : "Resend sign-in link"}
        </button>
        <button
          onClick={() => void nav({ to: "/auth/sign-in" })}
          className="text-xs text-muted-dark/60 hover:text-muted-dark transition"
        >
          ← Back to sign in
        </button>
      </div>
    </motion.div>
  );
}
