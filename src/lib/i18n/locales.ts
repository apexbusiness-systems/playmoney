export const SUPPORTED_LOCALES = ["en", "fr"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const I18N_STORAGE_KEY = "playmoney.locale";

export function localeToHtmlLang(locale: Locale): "en-CA" | "fr-CA" {
  return locale === "fr" ? "fr-CA" : "en-CA";
}

/**
 * Detects the user's locale from a browser language code or list.
 * Fallbacks to English.
 */
export function detectLocale(input?: readonly string[] | string | null): Locale {
  if (!input) {
    if (typeof navigator !== "undefined" && navigator.languages) {
      input = navigator.languages;
    } else if (typeof navigator !== "undefined" && navigator.language) {
      input = navigator.language;
    }
  }

  const list = typeof input === "string" ? [input] : input || [];

  for (const lang of list) {
    if (!lang) continue;
    const clean = lang.trim().toLowerCase();
    if (clean === "fr" || clean.startsWith("fr-") || clean.startsWith("fr_")) {
      return "fr";
    }
    if (clean === "en" || clean.startsWith("en-") || clean.startsWith("en_")) {
      return "en";
    }
  }

  return DEFAULT_LOCALE;
}
