import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { PMButton } from "@/components/pm/Button";
import { PMCard } from "@/components/pm/Card";
import { IconChip, PMIcon } from "@/components/pm/Icon";
import { OccupationStep } from "@/components/onboarding/OccupationStep";
import { auth } from "@/lib/playmoney/client";
import type { OccupationContext } from "@/lib/playmoney/types";

export const Route = createFileRoute("/app/onboarding")({
  head: () => ({ meta: [{ title: "Get set up — PlayMoney" }] }),
  component: Onboarding,
});

type Step = 1 | 2 | 3 | 4;
const TOTAL_STEPS = 4;

function Onboarding() {
  const [step, setStep] = useState<Step>(1);
  const [saving, setSaving] = useState(false);
  const nav = useNavigate();

  async function handleOccupationComplete(context: OccupationContext) {
    setSaving(true);
    try {
      await auth.saveContext(context);
    } catch {
      // Context is a ranking hint, not a gate — never block onboarding on it.
      toast.error("We couldn't save that just now", {
        description: "No problem — you can keep going; we'll tune your matches as we learn.",
      });
    } finally {
      setSaving(false);
      setStep(3);
    }
  }

  return (
    <section className="bg-sand">
      <div className="container-pm py-14">
        <p className="eyebrow text-ink-muted">
          Setup · step {step} of {TOTAL_STEPS}
        </p>
        <h1 className="h2-display mt-3">Let's get you on the receiving end.</h1>

        <div className="mt-10 grid gap-3 sm:grid-cols-4">
          {([1, 2, 3, 4] as const).map((i) => (
            <div
              key={i}
              className="h-1.5 rounded-full"
              style={{ background: i <= step ? "#0F6B50" : "#E5DBC6" }}
            />
          ))}
        </div>

        <motion.div
          key={step}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="mt-10 grid gap-6 lg:grid-cols-[3fr_2fr]"
        >
          <PMCard pad="lg">
            {step === 1 && (
              <>
                <IconChip name="envelope" />
                <h2 className="mt-5 font-display text-2xl font-semibold">
                  Forward your billing receipts
                </h2>
                <p className="mt-2 text-ink-muted">
                  Auto-forward billing emails to{" "}
                  <code className="rounded bg-sand px-2 py-0.5">find@inbox.playmoney.app</code>. No
                  password sharing, no read access to your inbox.
                </p>
                <ol className="mt-6 space-y-3 text-sm text-ink-muted">
                  <li>1. Open Gmail → Settings → Forwarding</li>
                  <li>2. Filter: "subject: receipt OR statement OR invoice"</li>
                  <li>3. Forward to our address above</li>
                </ol>
              </>
            )}
            {step === 2 && (
              <OccupationStep onComplete={handleOccupationComplete} isLoading={saving} />
            )}
            {step === 3 && (
              <>
                <IconChip name="coin" />
                <h2 className="mt-5 font-display text-2xl font-semibold">
                  Where should the money land?
                </h2>
                <p className="mt-2 text-ink-muted">
                  A tokenised payout reference — never raw bank credentials.
                </p>
                <div className="mt-5 grid gap-3">
                  <Field label="Routing token" placeholder="tok_payout_***" />
                  <Field label="Legal name" placeholder="Maya Chen" />
                </div>
              </>
            )}
            {step === 4 && (
              <>
                <IconChip name="shield" />
                <h2 className="mt-5 font-display text-2xl font-semibold">
                  You're set. We're on it.
                </h2>
                <p className="mt-2 text-ink-muted">
                  We'll ping you only when there's money. No marketing. No noise.
                </p>
                <ul className="mt-5 space-y-2 text-sm text-ink">
                  {["money_landed alerts only", "Non-custodial routing", "One-tap approvals"].map(
                    (x) => (
                      <li key={x} className="flex items-center gap-2">
                        <PMIcon name="check" width={16} height={16} /> {x}
                      </li>
                    ),
                  )}
                </ul>
              </>
            )}

            {/* Step 2 (occupation) owns its own Continue button inside OccupationStep. */}
            <div className="mt-8 flex items-center gap-3">
              {step !== 2 && (
                <PMButton
                  onClick={() => {
                    if (step === TOTAL_STEPS) nav({ to: "/app" });
                    else setStep((step + 1) as Step);
                  }}
                >
                  {step === TOTAL_STEPS ? "Open my wins" : "Continue"}{" "}
                  <PMIcon name="arrow" stroke="#FFFDF8" />
                </PMButton>
              )}
              {step > 1 && (
                <button
                  className="text-sm text-ink-muted hover:text-ink disabled:opacity-50"
                  onClick={() => setStep((step - 1) as Step)}
                  disabled={saving}
                >
                  Back
                </button>
              )}
            </div>
          </PMCard>

          <div
            className="rounded-[24px] border border-border-d p-7 text-text-dark"
            style={{ background: "#0E3B2D" }}
          >
            <p className="eyebrow text-muted-dark">Why this works</p>
            <p className="mt-3 font-display text-xl leading-snug">
              We never see passwords, never hold funds, and only message you when there's money to
              send.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-muted-dark">
              <li className="flex gap-2">
                <PMIcon name="shield" stroke="#A8C0B4" width={16} height={16} /> Tokenised payout —
                no bank credentials
              </li>
              <li className="flex gap-2">
                <PMIcon name="bell" stroke="#A8C0B4" width={16} height={16} /> Money-landed alerts
                only
              </li>
              <li className="flex gap-2">
                <PMIcon name="receipt" stroke="#A8C0B4" width={16} height={16} /> Export or delete
                data anytime
              </li>
            </ul>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Field({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <label className="block">
      <span className="eyebrow text-ink-muted">{label}</span>
      <input
        placeholder={placeholder}
        className="mt-1 h-12 w-full rounded-[12px] border border-border-l bg-card px-4 text-ink placeholder:text-ink-muted/60 focus-visible:border-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
      />
    </label>
  );
}
