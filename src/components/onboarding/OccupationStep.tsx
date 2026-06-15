import { useState } from "react";
import { type OccupationContext, type OccupationType } from "@/lib/playmoney/types";
import { cn } from "@/lib/utils";
import { IconChip, PMIcon } from "@/components/pm/Icon";
import { PMButton } from "@/components/pm/Button";

const OCCUPATION_OPTIONS: Array<{ value: OccupationType; label: string; hint: string }> = [
  { value: "employee", label: "Employee", hint: "Salaried or hourly, T4 / W-2" },
  { value: "gig_worker", label: "Gig worker", hint: "Uber, DoorDash, Lyft, Instacart" },
  { value: "freelancer", label: "Freelancer", hint: "Fiverr, Upwork, independent contracts" },
  { value: "small_business", label: "Business owner", hint: "Registered sole-prop or corporation" },
  { value: "student", label: "Student", hint: "Full- or part-time enrolment" },
  { value: "other", label: "Other", hint: "None of the above" },
];

const GIG_PLATFORMS = [
  "Uber",
  "DoorDash",
  "Lyft",
  "Instacart",
  "Fiverr",
  "Upwork",
  "Skip",
  "Amazon Flex",
];
const FREELANCE_PLATFORMS = ["Fiverr", "Upwork", "Toptal", "99designs", "Contra", "LinkedIn"];

interface Props {
  onComplete: (context: OccupationContext) => void;
  isLoading?: boolean;
}

/**
 * P6 onboarding question: capture occupation + platforms so the recovery engine
 * (`rankByContext` in `engine/situation.ts`) can surface the most relevant wins first.
 * Detection is unchanged — this only re-orders what the user sees.
 */
export function OccupationStep({ onComplete, isLoading = false }: Props) {
  const [occupationType, setOccupationType] = useState<OccupationType | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(new Set());

  const platformOptions =
    occupationType === "gig_worker"
      ? GIG_PLATFORMS
      : occupationType === "freelancer"
        ? FREELANCE_PLATFORMS
        : [];

  function togglePlatform(p: string) {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(p)) {
        next.delete(p);
      } else {
        next.add(p);
      }
      return next;
    });
  }

  function handleSubmit() {
    if (!occupationType) return;
    onComplete({
      occupationType,
      platforms: [...selectedPlatforms],
      priorityAvenueHints: [],
    });
  }

  return (
    <>
      <IconChip name="spark" />
      <h2 className="mt-5 font-display text-2xl font-semibold text-ink">Tell us about yourself</h2>
      <p className="mt-2 text-ink-muted">
        We'll surface the money-back opportunities that matter most for how you earn.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {OCCUPATION_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            aria-pressed={occupationType === opt.value}
            onClick={() => {
              setOccupationType(opt.value);
              setSelectedPlatforms(new Set());
            }}
            className={cn(
              "flex flex-col items-start rounded-[12px] border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold",
              occupationType === opt.value
                ? "border-gold bg-gold/10 ring-1 ring-gold"
                : "border-border-l hover:border-gold/40 hover:bg-sand",
            )}
          >
            <span className="text-sm font-semibold text-ink">{opt.label}</span>
            <span className="mt-0.5 text-xs text-ink-muted">{opt.hint}</span>
          </button>
        ))}
      </div>

      {platformOptions.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-sm font-semibold text-ink">Which platforms do you use?</p>
          <div className="flex flex-wrap gap-2">
            {platformOptions.map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={selectedPlatforms.has(p)}
                onClick={() => togglePlatform(p)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold",
                  selectedPlatforms.has(p)
                    ? "border-gold bg-gold text-ink"
                    : "border-border-l text-ink-muted hover:border-gold/40 hover:text-ink",
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8">
        <PMButton
          variant="primaryLight"
          disabled={!occupationType || isLoading}
          onClick={handleSubmit}
        >
          {isLoading ? "Saving…" : "Continue"}
          {!isLoading && <PMIcon name="arrow" stroke="#FFFDF8" />}
        </PMButton>
      </div>
    </>
  );
}
