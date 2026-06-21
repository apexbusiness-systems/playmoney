// P5 · Merchant directory + fuzzy-match for RCP dispatch destination resolution.
//
// matchMerchant(txnDescription) → best directory entry with confidence ≥ 0.85, or null.
// buildMerchantContact(txnDescription) → MerchantContact (method:'directory'|'manual').
//
// Matching algorithm: normalize transaction description (lowercase, alphanumeric+space),
// then check if the normalized string CONTAINS any registered alias. Confidence is based
// on prefix vs. contains. All alias matches are ≥ 0.90 by construction (3-char minimum
// alias length). Flinks/Plaid surfaces truncated strings like "TELUS*MOBILITY",
// "NETFLIX.COM", "AMZN*MKTPLACE" — this approach handles all common patterns.
//
// Seeded with top-50 Canadian dispute targets. Extend DIRECTORY as needed.

import type { MerchantContact } from "@/lib/playmoney/types";

interface DirectoryEntry {
  readonly slug: string;
  readonly name: string;
  readonly aliases: readonly string[]; // all lowercase, alphanumeric + spaces
  readonly disputeEmail?: string;
  readonly disputeUrl?: string;
}

export const DIRECTORY: readonly DirectoryEntry[] = [
  // ── Telecom ──────────────────────────────────────────────────────────────
  {
    slug: "bell",
    name: "Bell Canada",
    aliases: ["bell canada", "bell mobility", "bell aliant", "bell mts", "bell"],
    disputeUrl: "https://www.bell.ca/Support/Billing",
  },
  {
    slug: "rogers",
    name: "Rogers Communications",
    aliases: ["rogers comm", "rogers wireless", "rogers cable", "rogers"],
    disputeUrl: "https://www.rogers.com/customer-support/billing-questions",
  },
  {
    slug: "telus",
    name: "TELUS Communications",
    aliases: ["telus mobility", "telus communications", "telus"],
    disputeUrl: "https://www.telus.com/en/support/billing",
  },
  {
    slug: "fido",
    name: "Fido",
    aliases: ["fido"],
    disputeUrl: "https://www.fido.ca/consumer/support/billing",
  },
  {
    slug: "virginplus",
    name: "Virgin Plus",
    aliases: ["virgin plus", "virgin mobile"],
    disputeUrl: "https://www.virginplus.ca/en/support/billing.html",
  },
  {
    slug: "koodo",
    name: "Koodo Mobile",
    aliases: ["koodo mobile", "koodo"],
    disputeUrl: "https://www.koodomobile.com/en/help",
  },
  {
    slug: "freedom",
    name: "Freedom Mobile",
    aliases: ["freedom mobile", "shaw mobile", "freedom"],
    disputeUrl: "https://www.freedommobile.ca/en/support",
  },
  {
    slug: "videotron",
    name: "Videotron",
    aliases: ["videotron"],
    disputeUrl: "https://www.videotron.com/support",
  },
  {
    slug: "sasktel",
    name: "SaskTel",
    aliases: ["sasktel"],
    disputeUrl: "https://www.sasktel.com/about-sasktel/contact-us",
  },
  // ── Streaming ─────────────────────────────────────────────────────────────
  {
    slug: "netflix",
    name: "Netflix",
    aliases: ["netflix.com", "netflix"],
    disputeUrl: "https://help.netflix.com/en/contactus",
  },
  {
    slug: "amazon-prime",
    name: "Amazon Prime",
    aliases: ["amazon prime video", "amzn digital", "prime video"],
    disputeUrl: "https://www.amazon.ca/gp/help/customer/display.html",
  },
  {
    slug: "spotify",
    name: "Spotify",
    aliases: ["spotify.com", "spotify"],
    disputeUrl: "https://support.spotify.com",
  },
  {
    slug: "apple",
    name: "Apple",
    aliases: ["apple.com bill", "apple com bill", "itunes.com", "apple itunes", "apple"],
    disputeUrl: "https://getsupport.apple.com",
  },
  {
    slug: "disney-plus",
    name: "Disney+",
    aliases: ["disney plus", "disneyplus"],
    disputeUrl: "https://help.disneyplus.com",
  },
  {
    slug: "crave",
    name: "Crave",
    aliases: ["crave tv", "cravety", "crave"],
    disputeUrl: "https://www.crave.ca/en/help",
  },
  {
    slug: "youtube",
    name: "YouTube Premium",
    aliases: ["youtube premium", "google youtube"],
    disputeUrl: "https://support.google.com/youtube",
  },
  {
    slug: "paramount",
    name: "Paramount+",
    aliases: ["paramount plus", "paramountplus"],
    disputeUrl: "https://help.paramountplus.com",
  },
  // ── Cloud / SaaS ──────────────────────────────────────────────────────────
  {
    slug: "adobe",
    name: "Adobe",
    aliases: ["adobe inc", "adobe systems", "adobe"],
    disputeEmail: "adobe-billing@adobe.com",
    disputeUrl: "https://helpx.adobe.com/contact.html",
  },
  {
    slug: "microsoft",
    name: "Microsoft",
    aliases: ["microsoft 365", "microsoft office", "msft", "microsoft"],
    disputeUrl: "https://support.microsoft.com/contactus",
  },
  {
    slug: "google",
    name: "Google",
    aliases: ["google one", "google storage", "google play", "google workspace", "google"],
    disputeUrl: "https://support.google.com/payments",
  },
  {
    slug: "dropbox",
    name: "Dropbox",
    aliases: ["dropbox"],
    disputeUrl: "https://www.dropbox.com/support",
  },
  {
    slug: "zoom",
    name: "Zoom",
    aliases: ["zoom video", "zoom.us", "zoom"],
    disputeUrl: "https://support.zoom.us",
  },
  {
    slug: "linkedin",
    name: "LinkedIn",
    aliases: ["linkedin premium", "linkedin"],
    disputeUrl: "https://www.linkedin.com/help/linkedin",
  },
  {
    slug: "canva",
    name: "Canva",
    aliases: ["canva"],
    disputeUrl: "https://www.canva.com/help",
  },
  // ── Finance ───────────────────────────────────────────────────────────────
  {
    slug: "paypal",
    name: "PayPal",
    aliases: ["paypal"],
    disputeUrl: "https://www.paypal.com/ca/smarthelp/home",
  },
  {
    slug: "wealthsimple",
    name: "Wealthsimple",
    aliases: ["wealthsimple"],
    disputeUrl: "https://www.wealthsimple.com/en-ca/support",
  },
  {
    slug: "shopify",
    name: "Shopify",
    aliases: ["shopify"],
    disputeUrl: "https://help.shopify.com/en/questions",
  },
  // ── Utilities ─────────────────────────────────────────────────────────────
  {
    slug: "epcor",
    name: "EPCOR",
    aliases: ["epcor"],
    disputeUrl: "https://www.epcor.com/contact-us",
  },
  {
    slug: "enmax",
    name: "ENMAX",
    aliases: ["enmax"],
    disputeUrl: "https://www.enmax.com/contact-us",
  },
  {
    slug: "bchydro",
    name: "BC Hydro",
    aliases: ["bc hydro", "bchydro"],
    disputeUrl: "https://www.bchydro.com/contact-us.html",
  },
  {
    slug: "hydroone",
    name: "Hydro One",
    aliases: ["hydro one", "hydroone"],
    disputeUrl: "https://www.hydroone.com/help-and-support/contact-us",
  },
  {
    slug: "torontohydro",
    name: "Toronto Hydro",
    aliases: ["toronto hydro", "torontohydro"],
    disputeUrl: "https://www.torontohydro.com/for-home/contact-us",
  },
  {
    slug: "enbridge",
    name: "Enbridge Gas",
    aliases: ["enbridge gas", "union gas", "enbridge"],
    disputeUrl: "https://www.enbridgegas.com/about-enbridge-gas/contact-us",
  },
  {
    slug: "fortisbc",
    name: "FortisBC",
    aliases: ["fortis bc", "fortisbc"],
    disputeUrl: "https://www.fortisbc.com/about/contact-us",
  },
  {
    slug: "atco",
    name: "ATCO Gas",
    aliases: ["atco gas", "atco"],
    disputeUrl: "https://www.atco.com/en-ca/for-home/contact-us.html",
  },
  {
    slug: "nspower",
    name: "Nova Scotia Power",
    aliases: ["ns power", "nova scotia power", "nspower"],
    disputeUrl: "https://www.nspower.ca/contact",
  },
  {
    slug: "manitobahydro",
    name: "Manitoba Hydro",
    aliases: ["manitoba hydro", "manitobahydro"],
    disputeUrl: "https://www.hydro.mb.ca/contact_us",
  },
  // ── Retail / E-commerce ───────────────────────────────────────────────────
  {
    slug: "amazon",
    name: "Amazon Canada",
    aliases: ["amazon.ca", "amzn mktplace", "amzn mktp ca", "amzn", "amazon ca", "amazon"],
    disputeUrl: "https://www.amazon.ca/gp/help/customer/display.html",
  },
  {
    slug: "costco",
    name: "Costco",
    aliases: ["costco"],
    disputeUrl: "https://www.costco.ca/CustomerService.html",
  },
  {
    slug: "bestbuy",
    name: "Best Buy Canada",
    aliases: ["best buy", "bestbuy"],
    disputeUrl: "https://www.bestbuy.ca/en-ca/help",
  },
  {
    slug: "walmart",
    name: "Walmart Canada",
    aliases: ["walmart canada", "walmart"],
    disputeUrl: "https://www.walmart.ca/en/help",
  },
  // ── Delivery / Ride ───────────────────────────────────────────────────────
  {
    slug: "doordash",
    name: "DoorDash",
    aliases: ["doordash"],
    disputeUrl: "https://help.doordash.com",
  },
  {
    slug: "ubereats",
    name: "Uber Eats",
    aliases: ["uber eats", "ubereats"],
    disputeUrl: "https://help.uber.com",
  },
  {
    slug: "uber",
    name: "Uber",
    aliases: ["uber"],
    disputeUrl: "https://help.uber.com",
  },
  {
    slug: "skipthedishes",
    name: "SkipTheDishes",
    aliases: ["skip the dishes", "skipthedishes", "skip"],
    disputeUrl: "https://www.skipthedishes.com/support",
  },
  // ── Fitness ───────────────────────────────────────────────────────────────
  {
    slug: "goodlife",
    name: "GoodLife Fitness",
    aliases: ["goodlife fitness", "goodlife"],
    disputeUrl: "https://www.goodlifefitness.com/contact",
  },
  {
    slug: "peloton",
    name: "Peloton",
    aliases: ["peloton"],
    disputeUrl: "https://support.onepeloton.ca",
  },
  {
    slug: "planetfitness",
    name: "Planet Fitness",
    aliases: ["planet fitness", "planetfitness"],
    disputeUrl: "https://www.planetfitness.com/contact-us",
  },
];

// ── Matching ──────────────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface MerchantMatch {
  entry: DirectoryEntry;
  confidence: number;
}

/**
 * Fuzzy-match a transaction description against the merchant directory.
 * Returns the best match with confidence ≥ 0.85, or null.
 * Minimum alias length: 3 chars (prevents false positives on short tokens).
 */
export function matchMerchant(txnDescription: string): MerchantMatch | null {
  const needle = normalize(txnDescription);
  let best: MerchantMatch | null = null;

  for (const entry of DIRECTORY) {
    for (const alias of entry.aliases) {
      if (alias.length < 3) continue;
      if (!needle.includes(alias)) continue;

      // Confidence: exact → 1.0, prefix → 0.95, contains → 0.90
      const confidence =
        needle === alias ? 1.0 : needle.startsWith(alias + " ") || needle === alias ? 0.95 : 0.9;

      if (!best || confidence > best.confidence) {
        best = { entry, confidence };
      }
    }
  }

  return best;
}

/**
 * Derive a MerchantContact from a transaction description.
 * method:'directory' when the merchant is in the directory;
 * method:'manual' (no email/url) when not found — the user must supply contact info.
 */
export function buildMerchantContact(txnDescription: string): MerchantContact {
  const match = matchMerchant(txnDescription);
  if (match) {
    return {
      email: match.entry.disputeEmail,
      url: match.entry.disputeUrl,
      method: "directory",
    };
  }
  return { method: "manual" };
}
