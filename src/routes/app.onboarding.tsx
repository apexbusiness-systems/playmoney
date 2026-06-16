import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
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

import { TOS_LATEST } from "@/legal/terms-of-service";
import { PRIVACY_LATEST } from "@/legal/privacy-policy";
import { PAD_LATEST } from "@/legal/pad-agreement";

// Currently-published agreement versions the user accepts on the consent step.
const TOS = TOS_LATEST;
const PRIVACY = PRIVACY_LATEST;
const PAD = PAD_LATEST;

// Alberta is the only active launch jurisdiction.
const CA_PROVINCES = [{ label: "Alberta", value: "AB" }] as const;
function Onboarding() {
  const [step, setStep] = useState<Step>(1);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [capturedContext, setCapturedContext] = useState<OccupationContext | null>(null);
  const [payoutToken, setPayoutToken] = useState("");
  const [legalName, setLegalName] = useState("");
  const [country] = useState<"CA">("CA");
  const [province, setProvince] = useState("AB");
  const [tosAccepted, setTosAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [padAccepted, setPadAccepted] = useState(false);
  const nav = useNavigate();

  const canSubmit =
    tosAccepted &&
    privacyAccepted &&
    padAccepted &&
    legalName.trim().length > 0 &&
    payoutToken.trim().length > 0 &&
    !submitting;

  async function handleOccupationComplete(context: OccupationContext) {
    setSaving(true);
    setCapturedContext(context);
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

  async function handleFinalSubmit() {
    setSubmitting(true);
    try {
      const res = await auth.submitOnboarding({
        country,
        province: province || null,
        tosVersion: TOS.version,
        tosContentHash: TOS.hash,
        privacyVersion: PRIVACY.version,
        privacyContentHash: PRIVACY.hash,
        padMethod: "card_on_file",
        padAmountBasis: PAD.amountBasis,
        padAdvanceNoticeDays: 0,
        padCancellationPath: PAD.cancellationPath,
        padWaiveAdvanceNotice: false,
        displayName: legalName.trim(),
        payoutRef: payoutToken.trim(),
        occupationContext: capturedContext ?? undefined,
      });
      if (res.ok) {
        toast.success("You're all set", { description: "We're watching for your money now." });
        nav({ to: "/app" });
      } else {
        toast.error("We couldn't finish setup", { description: res.reason });
      }
    } catch {
      toast.error("Setup didn't go through", { description: "Please try again in a moment." });
    } finally {
      setSubmitting(false);
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
                  {/* Jurisdiction — determines which currency and legal regime applies. */}
                  <div>
                    <label className="eyebrow block text-ink-muted">Country</label>
                    <select
                      className="mt-1.5 h-11 w-full rounded-[12px] border border-border-l bg-card px-3 text-ink focus-visible:border-evergreen focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-evergreen"
                      value={country}
                      disabled
                      aria-describedby="launch-jurisdiction-note"
                    >
                      <option value="CA">Canada</option>
                    </select>
                  </div>
                  <div>
                    <label className="eyebrow block text-ink-muted">Province</label>
                    <select
                      className="mt-1.5 h-11 w-full rounded-[12px] border border-border-l bg-card px-3 text-ink focus-visible:border-evergreen focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-evergreen"
                      value={province}
                      onChange={(e) => setProvince(e.target.value)}
                      aria-describedby="launch-jurisdiction-note"
                    >
                      {CA_PROVINCES.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                    <p id="launch-jurisdiction-note" className="mt-1 text-xs text-ink-muted">
                      Alberta only during launch. United States access is deferred.
                    </p>
                  </div>
                  <Field
                    label="Routing token"
                    placeholder="tok_payout_***"
                    value={payoutToken}
                    onChange={setPayoutToken}
                    autoComplete="off"
                  />
                  <Field
                    label="Legal name"
                    placeholder="Maya Chen"
                    value={legalName}
                    onChange={setLegalName}
                    autoComplete="name"
                  />
                </div>
              </>
            )}
            {step === 4 && (
              <>
                <IconChip name="shield" />
                <h2 className="mt-5 font-display text-2xl font-semibold">
                  One last thing — your agreement.
                </h2>
                <p className="mt-2 text-ink-muted">
                  Alberta, Canada · non-custodial. We charge a fee only after we recover money for
                  you.
                </p>
                <div className="mt-5 space-y-2">
                  <Consent checked={tosAccepted} onChange={setTosAccepted}>
                    I agree to the <span className="font-semibold text-ink">Terms of Service</span>{" "}
                    (internet-sales agreement).
                  </Consent>
                  <Consent checked={privacyAccepted} onChange={setPrivacyAccepted}>
                    I've read the <span className="font-semibold text-ink">Privacy Policy</span>.
                  </Consent>
                  <Consent checked={padAccepted} onChange={setPadAccepted}>
                    I authorize a <span className="font-semibold text-ink">card-on-file fee</span>{" "}
                    of 25% of any amount recovered, charged only after the money lands. Cancel
                    anytime.
                  </Consent>
                </div>
              </>
            )}

            {/* Step 2 (occupation) owns its own Continue button inside OccupationStep. */}
            <div className="mt-8 flex items-center gap-3">
              {step !== 2 && (
                <PMButton
                  disabled={step === TOTAL_STEPS && !canSubmit}
                  onClick={() => {
                    if (step === TOTAL_STEPS) void handleFinalSubmit();
                    else setStep((step + 1) as Step);
                  }}
                >
                  {step === TOTAL_STEPS
                    ? submitting
                      ? "Setting up…"
                      : "Open my wins"
                    : "Continue"}{" "}
                  <PMIcon name="arrow" stroke="#FFFDF8" />
                </PMButton>
              )}
              {step > 1 && (
                <button
                  className="text-sm text-ink-muted hover:text-ink disabled:opacity-50"
                  onClick={() => setStep((step - 1) as Step)}
                  disabled={saving || submitting}
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

function Field({
  label,
  placeholder,
  value,
  onChange,
  type = "text",
  autoComplete,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="eyebrow text-ink-muted">{label}</span>
      <input
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-12 w-full rounded-[12px] border border-border-l bg-card px-4 text-ink placeholder:text-ink-muted/60 focus-visible:border-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
      />
    </label>
  );
}

function Consent({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-[12px] border border-border-l bg-card p-3 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-[#0F6B50]"
      />
      <span className="text-ink-muted">{children}</span>
    </label>
  );
}
