// P6 · Onboarding server fns.
//
// The write path (ToS/Privacy/PAD/profile/context capture) lives behind the
// AuthClient contract seam (`auth.submitOnboarding` in mock.ts / supabase.ts),
// reusing the pure `processOnboarding` from `onboarding.core.ts` with RLS-scoped
// owner writes. That seam supersedes the old admin-client server fn, which tried
// to resolve the user from a PSP payout token (never an auth UUID) and could not work.
//
// This module keeps `checkOnboardingStatusFn` — a service-role gate read used by the
// go-live gate loaders (G-contract, G-pad) to report consent status truthfully.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Re-export the pure core so existing importers (and tests) keep one entrypoint.
export { OnboardingInput, processOnboarding } from "./onboarding.core";
export type { OnboardingResult } from "./onboarding.core";

/**
 * Server fn: check whether a user has completed onboarding consent.
 * Used by gate loaders (G-contract, G-pad) to read truthful captured data.
 */
export const checkOnboardingStatusFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ userId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { getAdminClient } = await import("@/lib/supabase/admin.server");
    const sb = getAdminClient();

    const AcceptanceTypeRow = z.object({ agreement_type: z.string() });
    const [tosRows, padRows] = await Promise.all([
      sb.from("user_acceptances").select("agreement_type").eq("owner_id", data.userId),
      sb.from("pad_consents").select("id").eq("owner_id", data.userId).eq("status", "active"),
    ]);

    const types = new Set(
      (tosRows.data ?? []).map((r) => AcceptanceTypeRow.parse(r).agreement_type),
    );
    const hasPad = (padRows.data ?? []).length > 0;
    return {
      hasToS: types.has("tos"),
      hasPrivacy: types.has("privacy"),
      hasPad,
      consentComplete: types.has("tos") && types.has("privacy") && hasPad,
    };
  });
