// Currency helpers + React hook for locale-adaptive money formatting.
//
// Supported currencies: CAD (Canada) and USD (United States).
// Source of truth: profile.country set during onboarding.
// Unauthenticated fallback: browser locale (navigator.language).
// Default when neither is available: CAD.

import { useQuery } from "@tanstack/react-query";
import { auth } from "./client";
import { formatMoney } from "./mock";

export type AppCurrency = "CAD" | "USD";

/** Derive display currency from a jurisdiction country code. */
export function currencyForCountry(country?: string): AppCurrency {
  if (country?.toUpperCase() === "US") return "USD";
  return "CAD";
}

/**
 * Best-effort browser locale detection for unauthenticated pages (landing,
 * sign-in). Reads navigator.language; en-US → USD, everything else → CAD.
 * Returns CAD in SSR/non-browser environments.
 */
export function detectBrowserCurrency(): AppCurrency {
  try {
    if (typeof navigator === "undefined") return "CAD";
    const lang = navigator.language ?? "";
    if (lang === "en-US" || lang.startsWith("en-US")) return "USD";
    return "CAD";
  } catch {
    return "CAD";
  }
}

/**
 * React hook — returns the current user's display currency.
 * Reads from the authenticated profile (profile.country); falls back to
 * browser locale detection for unauthenticated/loading states.
 * React Query caches the profile, so calling this in multiple components
 * costs only one network request.
 */
export function useCurrency(): AppCurrency {
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => auth.getProfile(),
    staleTime: 5 * 60 * 1000, // profile is stable; don't refetch every render
  });
  if (profile?.country) return currencyForCountry(profile.country);
  return detectBrowserCurrency();
}

/**
 * React hook — returns a pre-bound money formatter for the current user's
 * currency. Drop-in replacement for the raw `formatMoney` import in routes:
 *
 *   const fmt = useFormatMoney();
 *   fmt(rec.userNet)  →  "$35.00" (USD) or "CA$35.00" (CAD)
 */
export function useFormatMoney(): (cents: number) => string {
  const currency = useCurrency();
  return (cents: number) => formatMoney(cents, currency);
}
