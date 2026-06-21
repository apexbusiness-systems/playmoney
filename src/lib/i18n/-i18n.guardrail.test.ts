import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { en, fr, messages } from "./messages";
import { detectLocale, localeToHtmlLang, DEFAULT_LOCALE, SUPPORTED_LOCALES } from "./locales";
import { interpolate } from "./interpolate";

// ---------------------------------------------------------------------------
// 1. Key parity: fr must have every key that en has, no more, no less.
// ---------------------------------------------------------------------------
describe("I18n · key parity (en ↔ fr)", () => {
  const enKeys = Object.keys(en).sort();
  const frKeys = Object.keys(fr).sort();

  it("fr has the same number of keys as en", () => {
    expect(frKeys.length).toBe(enKeys.length);
  });

  it("fr is not missing any keys from en", () => {
    const missing = enKeys.filter((k) => !(k in fr));
    expect(missing).toEqual([]);
  });

  it("fr has no extra keys not present in en", () => {
    const extra = frKeys.filter((k) => !(k in en));
    expect(extra).toEqual([]);
  });

  it("all keys are non-empty strings in both locales", () => {
    for (const key of enKeys) {
      expect(typeof en[key as keyof typeof en]).toBe("string");
      expect((en[key as keyof typeof en] as string).length).toBeGreaterThan(0);
      expect(typeof fr[key as keyof typeof fr]).toBe("string");
      expect((fr[key as keyof typeof fr] as string).length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// 2. messages export shape
// ---------------------------------------------------------------------------
describe("I18n · messages export", () => {
  it("exports en and fr under messages", () => {
    expect(messages.en).toBe(en);
    expect(messages.fr).toBe(fr);
  });

  it("includes all SUPPORTED_LOCALES as message bundles", () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(messages).toHaveProperty(locale);
    }
  });
});

// ---------------------------------------------------------------------------
// 3. Locale detection
// ---------------------------------------------------------------------------
describe("I18n · detectLocale", () => {
  it("detects 'fr' for exact match", () => {
    expect(detectLocale("fr")).toBe("fr");
  });

  it("detects 'fr' for 'fr-CA'", () => {
    expect(detectLocale("fr-CA")).toBe("fr");
  });

  it("detects 'fr' for 'FR_BE' (case-insensitive)", () => {
    expect(detectLocale("FR_BE")).toBe("fr");
  });

  it("detects 'en' for exact match", () => {
    expect(detectLocale("en")).toBe("en");
  });

  it("detects 'en' for 'en-US'", () => {
    expect(detectLocale("en-US")).toBe("en");
  });

  it("falls back to DEFAULT_LOCALE for unknown language", () => {
    expect(detectLocale("zh-TW")).toBe(DEFAULT_LOCALE);
  });

  it("falls back to DEFAULT_LOCALE for null", () => {
    expect(detectLocale(null)).toBe(DEFAULT_LOCALE);
  });

  it("falls back to DEFAULT_LOCALE for empty string", () => {
    expect(detectLocale("")).toBe(DEFAULT_LOCALE);
  });

  it("detects 'fr' from an array where fr comes first", () => {
    expect(detectLocale(["fr-CA", "en-US"])).toBe("fr");
  });

  it("detects 'en' from an array where en comes first", () => {
    expect(detectLocale(["en-CA", "fr-FR"])).toBe("en");
  });

  it("DEFAULT_LOCALE is 'en'", () => {
    expect(DEFAULT_LOCALE).toBe("en");
  });
});

// ---------------------------------------------------------------------------
// 4. localeToHtmlLang
// ---------------------------------------------------------------------------
describe("I18n · localeToHtmlLang", () => {
  it("maps 'en' → 'en-CA'", () => {
    expect(localeToHtmlLang("en")).toBe("en-CA");
  });

  it("maps 'fr' → 'fr-CA'", () => {
    expect(localeToHtmlLang("fr")).toBe("fr-CA");
  });
});

// ---------------------------------------------------------------------------
// 5. interpolate helper
// ---------------------------------------------------------------------------
describe("I18n · interpolate", () => {
  it("returns template unchanged when no values given", () => {
    expect(interpolate("Hello, world!")).toBe("Hello, world!");
  });

  it("replaces a single placeholder", () => {
    expect(interpolate("Hello {name}", { name: "Maya" })).toBe("Hello Maya");
  });

  it("replaces multiple placeholders", () => {
    expect(interpolate("{a} and {b}", { a: "foo", b: "bar" })).toBe("foo and bar");
  });

  it("replaces numeric values", () => {
    expect(interpolate("{count} signals", { count: 42 })).toBe("42 signals");
  });

  it("leaves unreferenced values unused (no error)", () => {
    expect(interpolate("Hello", { unused: "x" })).toBe("Hello");
  });

  it("throws in test env for a missing interpolation key", () => {
    expect(() => interpolate("{missing}", {})).toThrow(/Missing interpolation value/);
  });

  it("handles templates with no placeholders even when values are passed", () => {
    expect(interpolate("No placeholders", { x: "y" })).toBe("No placeholders");
  });
});

// ---------------------------------------------------------------------------
// 6. No untranslated hardcoded English copy in migrated route files.
//    Source-level guardrail: each route/component that was migrated must
//    import useI18n and must NOT contain the sentinel strings that were
//    replaced by t() calls.
// ---------------------------------------------------------------------------

const routeBase = new URL("../../routes/", import.meta.url);
const componentBase = new URL("../../components/", import.meta.url);

function readSrc(relativePath: string, base: URL) {
  return readFileSync(fileURLToPath(new URL(relativePath, base)), "utf8");
}

// Sentinel strings that must NOT appear as raw literals in the rendered JSX of
// migrated files. We strip comment lines AND meta/head() title lines (which are
// intentionally left as static EN strings for SEO) before checking.
//
// Important: only include strings that are *never* used in page head() titles,
// only in JSX component bodies.
const FORBIDDEN_LITERALS: Record<string, string[]> = {
  "index.tsx": [
    // Eyebrow in hero section body — never in <head> meta
    "Good news, handled",
    // How It Works h2 — body-only, never in meta tags
    "Three ways your money comes home",
    // Ding section eyebrow — body-only
    "The ding",
  ],
  "auth/sign-in.tsx": [
    // Only in JSX body labels/buttons
    "Enter your email",
    "No password. No friction.",
  ],
  "auth/check-email.tsx": [
    // Body copy, not in meta title
    "Resend sign-in link",
    "Auto-submits when complete",
  ],
  "auth/callback.tsx": [
    // Body copy, not in meta title
    "Just a moment.",
    "Missing token_hash",
  ],
  "app.index.tsx": ["Found for you", "Landed in your account", "Tap any card to approve"],
  "app.activity.tsx": ["A complete, auditable trail", "Our fee ledger"],
  "app.settings.tsx": ["Small surface.", "Tokens, not credentials"],
  "app.onboarding.tsx": [
    "Let's get you on the receiving end",
    "We never see passwords, never hold funds",
  ],
  "app/pipeline.tsx": [
    // "Get it back" is a button label, never in head()
    "Get it back",
  ],
  "bank/connect.tsx": [
    // Body security bullets, never in head()
    "We cannot see or store your login credentials",
    "read-only access to transaction history",
  ],
  "bank/callback.tsx": ["Taking you to your dashboard", "Scan complete"],
  "payment/setup.tsx": ["No upfront costs.", "We only get paid when you do."],
};

describe("I18n · source-level migration guardrail (no raw EN literals in migrated files)", () => {
  for (const [file, forbidden] of Object.entries(FORBIDDEN_LITERALS)) {
    const src = readSrc(file, routeBase);
    for (const literal of forbidden) {
      it(`${file}: does not contain raw literal "${literal}"`, () => {
        // We allow the string in comments or as a key in messages.ts, but not as
        // a JSX child or attribute value. Strip comment lines before checking.
        const noComments = src
          .split("\n")
          .filter(
            (line) =>
              !line.trimStart().startsWith("//") &&
              !line.trimStart().startsWith("/*") &&
              !line.trimStart().startsWith("*"),
          )
          .join("\n");
        expect(noComments).not.toContain(literal);
      });
    }
  }

  // Components
  const confirmSrc = readSrc("pm/ConfirmSheet.tsx", componentBase);
  it("ConfirmSheet: does not contain raw 'Awaiting your OK'", () => {
    const noComments = confirmSrc
      .split("\n")
      .filter((l) => !l.trimStart().startsWith("//"))
      .join("\n");
    expect(noComments).not.toContain("Awaiting your OK");
  });

  const marqueesSrc = readSrc("pm/Marquee.tsx", componentBase);
  it("Marquee: does not contain raw 'Overdraft fee · Chase'", () => {
    const noComments = marqueesSrc
      .split("\n")
      .filter((l) => !l.trimStart().startsWith("//"))
      .join("\n");
    expect(noComments).not.toContain("Overdraft fee · Chase");
  });
});

// ---------------------------------------------------------------------------
// 7. Every migrated file imports useI18n (wiring check).
// ---------------------------------------------------------------------------
describe("I18n · wiring check (all migrated files import useI18n)", () => {
  const expectedFiles = [
    ["index.tsx", routeBase],
    ["auth/sign-in.tsx", routeBase],
    ["auth/check-email.tsx", routeBase],
    ["auth/callback.tsx", routeBase],
    ["app.index.tsx", routeBase],
    ["app.activity.tsx", routeBase],
    ["app.settings.tsx", routeBase],
    ["app.onboarding.tsx", routeBase],
    ["app/pipeline.tsx", routeBase],
    ["bank/connect.tsx", routeBase],
    ["bank/callback.tsx", routeBase],
    ["payment/setup.tsx", routeBase],
    ["pm/AppShell.tsx", componentBase],
    ["pm/ConfirmSheet.tsx", componentBase],
    ["pm/Marquee.tsx", componentBase],
    ["pm/StatusPill.tsx", componentBase],
    ["onboarding/OccupationStep.tsx", componentBase],
  ] as const;

  for (const [file, base] of expectedFiles) {
    it(`${file} imports useI18n from i18n provider`, () => {
      const src = readSrc(file, base as URL);
      expect(src).toMatch(
        /import\s+\{[^}]*useI18n[^}]*\}\s+from\s+["']@\/lib\/i18n\/I18nProvider["']/,
      );
    });
  }
});

// ---------------------------------------------------------------------------
// 8. fr values must not be identical to en values for key content strings.
//    (A French translation that is word-for-word the same as English is a bug.)
// ---------------------------------------------------------------------------
describe("I18n · translation is actually different from English for key phrases", () => {
  const keyPhrasesToCheck: (keyof typeof en)[] = [
    "landing.hero.title",
    "landing.hero.cta",
    "landing.how.title",
    "auth.signin.title",
    "auth.signin.btnSend",
    "auth.check.title",
    "app.nav.wins",
    "app.nav.activity",
    "app.nav.settings",
    "app.dashboard.foundTitle",
    "app.settings.dataDelete",
    "app.onboarding.mainTitle",
    "bank.connect.mainTitle",
    "payment.setup.mainTitle",
  ];

  for (const key of keyPhrasesToCheck) {
    it(`fr["${key}"] is translated differently from en["${key}"]`, () => {
      expect(fr[key]).not.toBe(en[key]);
    });
  }
});
