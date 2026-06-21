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
import { checkEligibility } from "@/lib/compliance/geofence";
import { useI18n } from "@/lib/i18n/I18nProvider";

export const Route = createFileRoute("/app/onboarding")({
  head: () => ({ meta: [{ title: "Get set up — PlayMoney" }] }),
  component: Onboarding,
});

type Step = 1 | 2 | 3 | 4;
const TOTAL_STEPS = 4;

/** Real email-format validation for the Interac e-Transfer payout destination. */
function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

import { TOS_LATEST } from "@/legal/terms-of-service";
import { PRIVACY_LATEST } from "@/legal/privacy-policy";
import { PAD_LATEST } from "@/legal/pad-agreement";

// Currently-published agreement versions the user accepts on the consent step.
const TOS = TOS_LATEST;
const PRIVACY = PRIVACY_LATEST;
const PAD = PAD_LATEST;

const CA_PROVINCES = [
  { label: "Alberta", value: "AB" },
  { label: "British Columbia", value: "BC" },
  { label: "Manitoba", value: "MB" },
  { label: "New Brunswick", value: "NB" },
  { label: "Newfoundland and Labrador", value: "NL" },
  { label: "Nova Scotia", value: "NS" },
  { label: "Ontario", value: "ON" },
  { label: "Prince Edward Island", value: "PE" },
  { label: "Quebec", value: "QC" },
  { label: "Saskatchewan", value: "SK" },
] as const;

const US_STATES = [
  { label: "Alabama", value: "AL" },
  { label: "Alaska", value: "AK" },
  { label: "Arizona", value: "AZ" },
  { label: "Arkansas", value: "AR" },
  { label: "California", value: "CA" },
  { label: "Colorado", value: "CO" },
  { label: "Connecticut", value: "CT" },
  { label: "Delaware", value: "DE" },
  { label: "Florida", value: "FL" },
  { label: "Georgia", value: "GA" },
  { label: "Hawaii", value: "HI" },
  { label: "Idaho", value: "ID" },
  { label: "Illinois", value: "IL" },
  { label: "Indiana", value: "IN" },
  { label: "Iowa", value: "IA" },
  { label: "Kansas", value: "KS" },
  { label: "Kentucky", value: "KY" },
  { label: "Louisiana", value: "LA" },
  { label: "Maine", value: "ME" },
  { label: "Maryland", value: "MD" },
  { label: "Massachusetts", value: "MA" },
  { label: "Michigan", value: "MI" },
  { label: "Minnesota", value: "MN" },
  { label: "Mississippi", value: "MS" },
  { label: "Missouri", value: "MO" },
  { label: "Montana", value: "MT" },
  { label: "Nebraska", value: "NE" },
  { label: "Nevada", value: "NV" },
  { label: "New Hampshire", value: "NH" },
  { label: "New Jersey", value: "NJ" },
  { label: "New Mexico", value: "NM" },
  { label: "New York", value: "NY" },
  { label: "North Carolina", value: "NC" },
  { label: "North Dakota", value: "ND" },
  { label: "Ohio", value: "OH" },
  { label: "Oklahoma", value: "OK" },
  { label: "Oregon", value: "OR" },
  { label: "Pennsylvania", value: "PA" },
  { label: "Rhode Island", value: "RI" },
  { label: "South Carolina", value: "SC" },
  { label: "South Dakota", value: "SD" },
  { label: "Tennessee", value: "TN" },
  { label: "Texas", value: "TX" },
  { label: "Utah", value: "UT" },
  { label: "Vermont", value: "VT" },
  { label: "Virginia", value: "VA" },
  { label: "Washington", value: "WA" },
  { label: "West Virginia", value: "WV" },
  { label: "Wisconsin", value: "WI" },
  { label: "Wyoming", value: "WY" },
] as const;

function Onboarding() {
  const [step, setStep] = useState<Step>(1);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [capturedContext, setCapturedContext] = useState<OccupationContext | null>(null);
  const [payoutEmail, setPayoutEmail] = useState("");
  const [legalName, setLegalName] = useState("");
  const [country, setCountry] = useState<"CA" | "US">("CA");
  const [province, setProvince] = useState("AB");
  const nav = useNavigate();
  const { t } = useI18n();

  const [tosAccepted, setTosAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [padAccepted, setPadAccepted] = useState(false);

  // Eligibility is derived from country/province selection; drives step-3 UX and final submit guard.
  const jurisdictionEligibility = checkEligibility(country, province || null);

  const payoutEmailValid = isValidEmail(payoutEmail);

  const canSubmit =
    tosAccepted &&
    privacyAccepted &&
    padAccepted &&
    legalName.trim().length > 0 &&
    payoutEmailValid &&
    !submitting;

  async function handleOccupationComplete(context: OccupationContext) {
    setSaving(true);
    setCapturedContext(context);
    try {
      await auth.saveContext(context);
    } catch {
      // Context is a ranking hint, not a gate — never block onboarding on it.
      toast.error(t("app.onboarding.step2.toastErrorTitle"), {
        description: t("app.onboarding.step2.toastErrorDesc"),
      });
    } finally {
      setSaving(false);
      setStep(3);
    }
  }

  async function handleFinalSubmit() {
    // Final eligibility guard — prevents submission from a non-eligible jurisdiction.
    if (!jurisdictionEligibility.eligible) {
      toast.error(t("app.onboarding.eligibilityError"), {
        description: jurisdictionEligibility.reason,
      });
      return;
    }
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
        // Interac e-Transfer email is the user's own non-custodial payout destination.
        payoutRef: payoutEmail.trim(),
        occupationContext: capturedContext ?? undefined,
      });
      if (res.ok) {
        toast.success(t("app.onboarding.toastSuccessTitle"), {
          description: t("app.onboarding.toastSuccessDesc"),
        });
        nav({ to: "/app" });
      } else {
        toast.error(t("app.onboarding.toastFailedTitle"), { description: res.reason });
      }
    } catch {
      toast.error(t("app.onboarding.toastFailedTitle"), {
        description: t("app.onboarding.toastFailedDesc"),
      });
    } finally {
      setSubmitting(false);
    }
  }

  const provinceLabel = CA_PROVINCES.find((p) => p.value === province)?.label ?? province;
  const jurisdictionLabel =
    country === "CA"
      ? `${provinceLabel}, Canada`
      : `${province || "United States"} · United States`;

  // Content for legal consents
  const tosLink = (
    <span className="font-semibold text-ink">{t("app.onboarding.step4.tosLabel")}</span>
  );
  const privacyLink = (
    <span className="font-semibold text-ink">{t("app.onboarding.step4.privacyLabel")}</span>
  );
  const cardLink = (
    <span className="font-semibold text-ink">{t("app.onboarding.step4.cardLabel")}</span>
  );

  const renderConsentText = (template: string, element: ReactNode) => {
    const parts = template.split(/\{[a-zA-Z]+\}/);
    return (
      <>
        {parts[0]}
        {element}
        {parts[1]}
      </>
    );
  };

  return (
    <section className="bg-sand">
      <div className="container-pm py-14">
        <p className="eyebrow text-ink-muted">
          {t("app.onboarding.stepIndicator", { step, total: TOTAL_STEPS })}
        </p>
        <h1 className="h2-display mt-3">{t("app.onboarding.mainTitle")}</h1>

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
                  {t("app.onboarding.step1.title")}
                </h2>
                <p className="mt-2 text-ink-muted">
                  {t("app.onboarding.step1.desc", { email: "find@inbox.playmoney.app" })}
                </p>
                <ol className="mt-6 space-y-3 text-sm text-ink-muted">
                  <li>{t("app.onboarding.step1.step1")}</li>
                  <li>{t("app.onboarding.step1.step2")}</li>
                  <li>{t("app.onboarding.step1.step3")}</li>
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
                  {t("app.onboarding.step3.title")}
                </h2>
                <p className="mt-2 text-ink-muted">{t("app.onboarding.step3.desc")}</p>
                <div className="mt-5 grid gap-3">
                  {/* Jurisdiction — determines which currency and legal regime applies. */}
                  <div>
                    <label className="eyebrow block text-ink-muted">
                      {t("app.onboarding.step3.country")}
                    </label>
                    <select
                      className="mt-1.5 h-11 w-full rounded-[12px] border border-border-l bg-card px-3 text-ink focus-visible:border-evergreen focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-evergreen"
                      value={country}
                      onChange={(e) => {
                        const c = e.target.value as "CA" | "US";
                        setCountry(c);
                        setProvince(c === "CA" ? "AB" : "TX");
                      }}
                    >
                      <option value="CA">Canada</option>
                      <option value="US">United States</option>
                    </select>
                  </div>
                  <div>
                    <label className="eyebrow block text-ink-muted">
                      {country === "CA"
                        ? t("app.onboarding.step3.province")
                        : t("app.onboarding.step3.state")}
                    </label>
                    <select
                      className="mt-1.5 h-11 w-full rounded-[12px] border border-border-l bg-card px-3 text-ink focus-visible:border-evergreen focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-evergreen"
                      value={province}
                      onChange={(e) => setProvince(e.target.value)}
                      aria-describedby="jurisdiction-status-note"
                    >
                      {country === "CA"
                        ? CA_PROVINCES.map((p) => (
                            <option key={p.value} value={p.value}>
                              {p.label}
                            </option>
                          ))
                        : US_STATES.map((s) => (
                            <option key={s.value} value={s.value}>
                              {s.label}
                            </option>
                          ))}
                    </select>
                    {/* Eligibility status — shown inline so users understand their options */}
                    {jurisdictionEligibility.eligible ? (
                      <p id="jurisdiction-status-note" className="mt-1 text-xs text-ink-muted">
                        {jurisdictionEligibility.status === "pilot"
                          ? t("app.onboarding.step3.pilot")
                          : t("app.onboarding.step3.available")}
                      </p>
                    ) : jurisdictionEligibility.status === "waitlist" ? (
                      <p id="jurisdiction-status-note" className="mt-1 text-xs text-ink-muted">
                        {t("app.onboarding.step3.waitlist")}
                      </p>
                    ) : (
                      <p id="jurisdiction-status-note" className="mt-1 text-xs text-ink-muted">
                        {jurisdictionEligibility.reason}
                      </p>
                    )}
                  </div>
                  <div>
                    <Field
                      label={t(
                        "app.onboarding.step3.emailLabel",
                      )} /* Email for Interac e-Transfer */
                      placeholder={t("app.onboarding.step3.emailPlaceholder")}
                      value={payoutEmail}
                      onChange={setPayoutEmail}
                      autoComplete="email"
                      type="email"
                    />
                    {payoutEmail.length > 0 && !payoutEmailValid && (
                      <p className="mt-1 text-xs text-red-500">
                        {t("app.onboarding.step3.emailError")}
                      </p>
                    )}
                  </div>
                  <Field
                    label={t("app.onboarding.step3.nameLabel")}
                    placeholder={t("app.onboarding.step3.namePlaceholder")}
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
                  {t("app.onboarding.step4.title")}
                </h2>
                <p className="mt-2 text-ink-muted">
                  {t("app.onboarding.step4.desc", { jurisdiction: jurisdictionLabel })}
                </p>
                <div className="mt-5 space-y-2">
                  <Consent checked={tosAccepted} onChange={setTosAccepted}>
                    {renderConsentText(t("app.onboarding.step4.tos"), tosLink)}
                  </Consent>
                  <Consent checked={privacyAccepted} onChange={setPrivacyAccepted}>
                    {renderConsentText(t("app.onboarding.step4.privacy"), privacyLink)}
                  </Consent>
                  <Consent checked={padAccepted} onChange={setPadAccepted}>
                    {renderConsentText(t("app.onboarding.step4.pad"), cardLink)}
                  </Consent>
                </div>
              </>
            )}

            {/* Step 2 (occupation) owns its own Continue button inside OccupationStep. */}
            <div className="mt-8 flex items-center gap-3">
              {step !== 2 && (
                <PMButton
                  disabled={
                    (step === TOTAL_STEPS && !canSubmit) ||
                    (step === 3 && !jurisdictionEligibility.eligible)
                  }
                  onClick={() => {
                    if (step === TOTAL_STEPS) void handleFinalSubmit();
                    else setStep((step + 1) as Step);
                  }}
                >
                  {step === TOTAL_STEPS
                    ? submitting
                      ? t("app.onboarding.btnSetup")
                      : t("app.onboarding.btnOpen")
                    : t("app.onboarding.btnContinue")}{" "}
                  <PMIcon name="arrow" stroke="#FFFDF8" />
                </PMButton>
              )}
              {step > 1 && (
                <button
                  className="text-sm text-ink-muted hover:text-ink disabled:opacity-50"
                  onClick={() => setStep((step - 1) as Step)}
                  disabled={saving || submitting}
                >
                  {t("app.onboarding.btnBack")}
                </button>
              )}
            </div>
          </PMCard>

          <div
            className="rounded-[24px] border border-border-d p-7 text-text-dark"
            style={{ background: "#0E3B2D" }}
          >
            <p className="eyebrow text-muted-dark">{t("app.onboarding.whyTitle")}</p>
            <p className="mt-3 font-display text-xl leading-snug">
              {t("app.onboarding.whySubtitle")}
            </p>
            <ul className="mt-6 space-y-3 text-sm text-muted-dark">
              <li className="flex gap-2">
                <PMIcon name="shield" stroke="#A8C0B4" width={16} height={16} />{" "}
                {t("app.onboarding.whyPoint1")}
              </li>
              <li className="flex gap-2">
                <PMIcon name="bell" stroke="#A8C0B4" width={16} height={16} />{" "}
                {t("app.onboarding.whyPoint2")}
              </li>
              <li className="flex gap-2">
                <PMIcon name="receipt" stroke="#A8C0B4" width={16} height={16} />{" "}
                {t("app.onboarding.whyPoint3")}
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
