// P6 · Onboarding consent — PURE core (no I/O, no server imports).
//
// Captures: (1) ToS + Privacy acceptance (CPA C-26.3 internet-sales, #11),
// (2) PAD/card-on-file consent with Rule H1 advance notice (#12), and (3) a
// jurisdiction attestation (geofence #8). All writers are injected, so the same
// logic runs behind the mock client (offline) and the Supabase client (RLS-scoped
// owner writes — `user_acceptances` / `pad_consents` are immutable by policy).

import { z } from "zod";
import { buildPadConsent, recordAcceptance, PadMethod } from "@/lib/compliance/contract";
import { checkEligibility } from "@/lib/compliance/geofence";
import { OccupationContext } from "@/lib/playmoney/types";

export const OnboardingInput = z.object({
  // Jurisdiction
  country: z.string().min(1),
  province: z.string().nullable(),
  // ToS acceptance
  tosVersion: z.string().min(1),
  tosContentHash: z.string().min(1),
  // Privacy Policy acceptance
  privacyVersion: z.string().min(1),
  privacyContentHash: z.string().min(1),
  // PAD / card-on-file consent (Rule H1)
  padMethod: PadMethod,
  padAmountBasis: z.string().min(1),
  padAdvanceNoticeDays: z.number().int().nonnegative(),
  padCancellationPath: z.string().min(1),
  padWaiveAdvanceNotice: z.boolean().default(false),
  // Identity attestation
  displayName: z.string().min(1),
  payoutRef: z.string().min(1),
  // Occupation context — optional; captured on the context discovery step.
  occupationContext: OccupationContext.optional(),
});
export type OnboardingInput = z.infer<typeof OnboardingInput>;

export type OnboardingResult =
  | { ok: true; message: string }
  | { ok: false; code: "jurisdiction_blocked" | "validation_error"; reason: string };

/**
 * Pure onboarding logic — all I/O injected for unit-testing.
 * Validates jurisdiction + builds consent records, then passes them to writers.
 */
export async function processOnboarding(input: {
  parsedInput: OnboardingInput;
  userId: string;
  now?: Date;
  writeAcceptance: (type: string, version: string, hash: string) => Promise<void>;
  writePadConsent: (consent: ReturnType<typeof buildPadConsent>) => Promise<void>;
  updateProfile: (displayName: string, payoutRef: string, province: string | null) => Promise<void>;
  saveContext?: (context: OccupationContext) => Promise<void>;
}): Promise<OnboardingResult> {
  const si = input.parsedInput;
  const now = input.now ?? new Date();

  // 1. Geofence check (#8).
  const eligibility = checkEligibility(si.country, si.province);
  if (!eligibility.eligible) {
    return { ok: false, code: "jurisdiction_blocked", reason: eligibility.reason };
  }

  // 2. Build + write ToS acceptance record (CPA C-26.3 #11).
  const tosRecord = recordAcceptance({
    ownerId: input.userId,
    agreementType: "tos",
    agreementVersion: si.tosVersion,
    contentHash: si.tosContentHash,
    now,
  });
  await input.writeAcceptance("tos", tosRecord.agreementVersion, tosRecord.contentHash);

  // 3. Build + write Privacy Policy acceptance.
  const privRecord = recordAcceptance({
    ownerId: input.userId,
    agreementType: "privacy",
    agreementVersion: si.privacyVersion,
    contentHash: si.privacyContentHash,
    now,
  });
  await input.writeAcceptance("privacy", privRecord.agreementVersion, privRecord.contentHash);

  // 4. Build + write PAD consent (Rule H1 #12). Throws on non-compliant input.
  const padConsent = buildPadConsent({
    ownerId: input.userId,
    method: si.padMethod,
    amountBasis: si.padAmountBasis,
    advanceNoticeDays: si.padAdvanceNoticeDays,
    cancellationPath: si.padCancellationPath,
    waiveAdvanceNotice: si.padWaiveAdvanceNotice,
    now,
  });
  await input.writePadConsent(padConsent);

  // 5. Update profile jurisdiction + display info.
  await input.updateProfile(si.displayName, si.payoutRef, eligibility.jurisdiction.province);

  // 6. Persist occupation context if provided and a saveContext handler is wired.
  if (si.occupationContext && input.saveContext) {
    await input.saveContext(si.occupationContext);
  }

  return { ok: true, message: "Onboarding consent recorded." };
}
