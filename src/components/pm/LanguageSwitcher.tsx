import { useI18n } from "@/lib/i18n/I18nProvider";

interface Props {
  variant?: "dark" | "light";
  className?: string;
}

export function LanguageSwitcher({ variant = "dark", className = "" }: Props) {
  const { locale, setLocale, t } = useI18n();

  const isDark = variant === "dark";

  return (
    <div
      className={`inline-flex rounded-full p-0.5 border ${
        isDark ? "bg-white/10 border-white/20" : "bg-sand border-border-l"
      } ${className}`}
      role="group"
      aria-label={t("language.switcher.aria")}
    >
      <button
        onClick={() => setLocale("en")}
        aria-pressed={locale === "en"}
        className={`rounded-full px-2.5 py-1 text-xs font-semibold tracking-wider transition-all min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer ${
          locale === "en"
            ? isDark
              ? "bg-white/15 text-text-dark shadow-sm"
              : "bg-card text-ink shadow-sm"
            : isDark
              ? "text-text-dark/70 hover:text-text-dark hover:bg-white/5"
              : "text-ink-muted hover:text-ink hover:bg-black/5"
        }`}
      >
        <span className="sr-only">English</span>
        <span aria-hidden="true">EN</span>
      </button>
      <button
        onClick={() => setLocale("fr")}
        aria-pressed={locale === "fr"}
        className={`rounded-full px-2.5 py-1 text-xs font-semibold tracking-wider transition-all min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer ${
          locale === "fr"
            ? isDark
              ? "bg-white/15 text-text-dark shadow-sm"
              : "bg-card text-ink shadow-sm"
            : isDark
              ? "text-text-dark/70 hover:text-text-dark hover:bg-white/5"
              : "text-ink-muted hover:text-ink hover:bg-black/5"
        }`}
      >
        <span className="sr-only">Français</span>
        <span aria-hidden="true">FR</span>
      </button>
    </div>
  );
}
