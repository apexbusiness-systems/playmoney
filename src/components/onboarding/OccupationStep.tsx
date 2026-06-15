import { useState } from "react";
import { type OccupationContext, type OccupationType } from "@/lib/playmoney/types";
import { cn } from "@/lib/utils";

const OCCUPATION_OPTIONS: Array<{ value: OccupationType; label: string; hint: string }> = [
  { value: "employee",       label: "Employee",       hint: "Salaried or hourly, T4 / W-2" },
  { value: "gig_worker",     label: "Gig worker",     hint: "Uber, DoorDash, Lyft, Instacart" },
  { value: "freelancer",     label: "Freelancer",     hint: "Fiverr, Upwork, independent contracts" },
  { value: "small_business", label: "Business owner", hint: "Registered sole-prop or corporation" },
  { value: "student",        label: "Student",        hint: "Full- or part-time enrolment" },
  { value: "other",          label: "Other",          hint: "None of the above" },
];

const GIG_PLATFORMS = ["Uber", "DoorDash", "Lyft", "Instacart", "Fiverr", "Upwork", "Skip", "Amazon Flex"];
const FREELANCE_PLATFORMS = ["Fiverr", "Upwork", "Toptal", "99designs", "Contra", "LinkedIn"];

interface Props {
  onComplete: (context: OccupationContext) => void;
  isLoading?: boolean;
}

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
      next.has(p) ? next.delete(p) : next.add(p);
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
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Tell us about yourself</h2>
        <p className="text-sm text-muted-foreground mt-1">
          We'll surface the most relevant money-back opportunities for you.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {OCCUPATION_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => {
              setOccupationType(opt.value);
              setSelectedPlatforms(new Set());
            }}
            className={cn(
              "flex flex-col items-start rounded-xl border p-4 text-left transition-colors",
              occupationType === opt.value
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-border hover:border-primary/40 hover:bg-muted/40",
            )}
          >
            <span className="text-sm font-medium">{opt.label}</span>
            <span className="text-xs text-muted-foreground mt-0.5">{opt.hint}</span>
          </button>
        ))}
      </div>

      {platformOptions.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2">Which platforms do you use?</p>
          <div className="flex flex-wrap gap-2">
            {platformOptions.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => togglePlatform(p)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  selectedPlatforms.has(p)
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:border-primary/40",
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        disabled={!occupationType || isLoading}
        onClick={handleSubmit}
        className="mt-2 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-40"
      >
        {isLoading ? "Saving…" : "Continue"}
      </button>
    </div>
  );
}
