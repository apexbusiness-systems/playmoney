import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
  useMemo,
  useCallback,
} from "react";
import {
  DEFAULT_LOCALE,
  detectLocale,
  I18N_STORAGE_KEY,
  localeToHtmlLang,
  type Locale,
} from "./locales";
import { messages, type MessageKey } from "./messages";
import { interpolate } from "./interpolate";

export interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey, values?: Record<string, string | number>) => string;
  htmlLang: "en-CA" | "fr-CA";
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  // SSR-safe lazy initial state. In SSR, we always use DEFAULT_LOCALE.
  // In the browser, we check localStorage and fallback to browser detection.
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === "undefined") return DEFAULT_LOCALE;
    try {
      const stored = localStorage.getItem(I18N_STORAGE_KEY) as Locale | null;
      if (stored && (stored === "en" || stored === "fr")) {
        return stored;
      }
    } catch {
      // Ignore storage errors
    }
    return detectLocale();
  });

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem(I18N_STORAGE_KEY, newLocale);
    } catch {
      // Ignore storage write errors
    }
  }, []);

  // Update HTML element attributes on mount and locale changes
  useEffect(() => {
    const html = document.documentElement;
    const lang = localeToHtmlLang(locale);
    html.lang = lang;
    html.setAttribute("data-locale", locale);
  }, [locale]);

  // Sync state between tabs
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === I18N_STORAGE_KEY) {
        const val = e.newValue as Locale | null;
        if (val && (val === "en" || val === "fr") && val !== locale) {
          setLocaleState(val);
        }
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [locale]);

  const t = useCallback(
    (key: MessageKey, values?: Record<string, string | number>): string => {
      const localeDict = messages[locale] || messages[DEFAULT_LOCALE];
      const template = localeDict[key];
      if (template === undefined) {
        const fallbackTemplate = messages[DEFAULT_LOCALE][key];
        if (fallbackTemplate === undefined) {
          const missingMsg = `I18n missing key: "${key}"`;
          if (
            typeof process !== "undefined" &&
            (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test")
          ) {
            throw new Error(missingMsg);
          }
          return String(key);
        }
        return interpolate(fallbackTemplate, values);
      }
      return interpolate(template, values);
    },
    [locale],
  );

  const htmlLang = useMemo(() => localeToHtmlLang(locale), [locale]);

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
      htmlLang,
    }),
    [locale, setLocale, t, htmlLang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return ctx;
}
