import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { auth } from "@/lib/playmoney/client";
import { MagicLinkSentError } from "@/lib/playmoney/supabase";
import { PMButton } from "@/components/pm/Button";

export const Route = createFileRoute("/auth/sign-in")({
  head: () => ({ meta: [{ title: "Sign in — PlayMoney" }] }),
  component: SignIn,
});

function SignIn() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

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
      toast.error("Couldn't send sign-in link", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-sm"
    >
      <h1 className="font-display text-center text-3xl font-semibold text-text-dark">Sign in</h1>
      <p className="mt-2 text-center text-sm text-muted-dark">
        Enter your email. We'll send a one-tap sign-in link.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label htmlFor="signin-email" className="eyebrow block text-muted-dark">
            Email address
          </label>
          <input
            id="signin-email"
            type="email"
            autoComplete="email"
            autoFocus
            required
            placeholder="you@example.com"
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
          {loading ? "Sending…" : "Send sign-in link"}
        </PMButton>
      </form>

      <p className="mt-6 text-center text-xs text-muted-dark">
        No password. No friction.{" "}
        <a href="/" className="underline hover:text-text-dark">
          Learn how PlayMoney works →
        </a>
      </p>
    </motion.div>
  );
}
