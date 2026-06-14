// P3 · SituationModel — derive recoverable SITUATIONS from ingested bank
// transactions. PURE + deterministic: no I/O, no clock, no randomness. Given the
// same transactions it always yields the same situations, so it is trivially
// testable and safe to run in BUILT mode (it takes no outbound action).
//
// A "situation" is a candidate problem (a fee, a duplicate charge, a stale
// subscription) tagged with a ProblemType. ProblemType is the user-facing
// RecoveryAvenue enum (types.ts); the AvenueRouter (router.ts) maps it onto an
// enabled administrative avenue (#9) before anything executes.

import { RecoveryAvenue, Situation } from "@/lib/playmoney/types";
import type { BankTransaction } from "@/lib/compliance/ports";

export type ProblemType = RecoveryAvenue;

export interface DetectedSituation {
  readonly situation: Situation;
  readonly problemType: ProblemType;
  readonly merchant: string;
  readonly amountCents: number;
  readonly evidenceTxnIds: readonly string[];
}

/** Fee/charge keywords that signal a reversible bank/merchant fee. */
const FEE_KEYWORDS = [
  "overdraft",
  "nsf",
  "non-sufficient",
  "service charge",
  "service fee",
  "atm fee",
  "foreign transaction",
  "fx fee",
  "monthly fee",
  "maintenance fee",
  "late fee",
];

/** Keywords that signal a billing error (charged after cancel, wrong line, etc.). */
const BILLING_ERROR_KEYWORDS = ["cancelled", "canceled", "cancel", "billing error", "wrong", "adjustment"];

const DUPLICATE_WINDOW_MS = 3 * 24 * 60 * 60 * 1000; // duplicates post within 72h
const RECURRING_MIN_OCCURRENCES = 3; // 3+ equal charges => a subscription pattern

function slug(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function hay(t: BankTransaction): string {
  return `${t.merchant} ${t.description}`.toLowerCase();
}

function latestPostedAt(txns: readonly BankTransaction[]): string {
  return txns.reduce((max, t) => (t.postedAt > max ? t.postedAt : max), txns[0].postedAt);
}

function makeSituation(
  merchant: string,
  problemType: ProblemType,
  index: number,
  detectedAt: string,
  summary: string,
): Situation {
  return Situation.parse({
    id: `sit_${slug(merchant)}_${problemType}_${index}`,
    merchant,
    detectedAt,
    summary,
  });
}

function groupByMerchant(txns: readonly BankTransaction[]): Map<string, BankTransaction[]> {
  const groups = new Map<string, BankTransaction[]>();
  for (const t of txns) {
    const list = groups.get(t.merchant) ?? [];
    list.push(t);
    groups.set(t.merchant, list);
  }
  return groups;
}

/**
 * Derive situations from a transaction history. Each transaction is consumed by
 * at most one situation, in priority order: duplicate charges > fees > billing
 * errors > recurring subscriptions. Amounts are matched on magnitude (abs cents).
 */
export function deriveSituations(transactions: readonly BankTransaction[]): DetectedSituation[] {
  const consumed = new Set<string>();
  const out: DetectedSituation[] = [];
  let seq = 0;

  // Stable ordering: by merchant, then chronological.
  const groups = groupByMerchant(transactions);
  const merchants = [...groups.keys()].sort();

  for (const merchant of merchants) {
    const txns = [...(groups.get(merchant) ?? [])].sort((a, b) => a.postedAt.localeCompare(b.postedAt));

    // 1) Duplicate charges: same magnitude within a 72h window.
    for (let i = 0; i < txns.length; i++) {
      const a = txns[i];
      if (consumed.has(a.id)) continue;
      const dupes = [a];
      for (let j = i + 1; j < txns.length; j++) {
        const b = txns[j];
        if (consumed.has(b.id)) continue;
        const sameAmount = Math.abs(a.amountCents) === Math.abs(b.amountCents);
        const withinWindow =
          Math.abs(new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime()) <= DUPLICATE_WINDOW_MS;
        if (sameAmount && withinWindow) dupes.push(b);
      }
      if (dupes.length >= 2) {
        for (const d of dupes) consumed.add(d.id);
        const amount = Math.abs(a.amountCents);
        out.push({
          situation: makeSituation(
            merchant,
            "double_charge",
            ++seq,
            latestPostedAt(dupes),
            `Charged ${dupes.length}× for the same amount at ${merchant}`,
          ),
          problemType: "double_charge",
          merchant,
          amountCents: amount,
          evidenceTxnIds: dupes.map((d) => d.id),
        });
      }
    }

    // 2) Fees (keyword) → fee_reversal.
    for (const t of txns) {
      if (consumed.has(t.id)) continue;
      if (FEE_KEYWORDS.some((k) => hay(t).includes(k))) {
        consumed.add(t.id);
        out.push({
          situation: makeSituation(
            merchant,
            "fee_reversal",
            ++seq,
            t.postedAt,
            `Reversible fee at ${merchant}: ${t.description}`,
          ),
          problemType: "fee_reversal",
          merchant,
          amountCents: Math.abs(t.amountCents),
          evidenceTxnIds: [t.id],
        });
      }
    }

    // 3) Billing errors (keyword) → billing_error.
    for (const t of txns) {
      if (consumed.has(t.id)) continue;
      if (BILLING_ERROR_KEYWORDS.some((k) => hay(t).includes(k))) {
        consumed.add(t.id);
        out.push({
          situation: makeSituation(
            merchant,
            "billing_error",
            ++seq,
            t.postedAt,
            `Possible billing error at ${merchant}: ${t.description}`,
          ),
          problemType: "billing_error",
          merchant,
          amountCents: Math.abs(t.amountCents),
          evidenceTxnIds: [t.id],
        });
      }
    }

    // 4) Recurring same-amount charges → subscription.
    const byAmount = new Map<number, BankTransaction[]>();
    for (const t of txns) {
      if (consumed.has(t.id)) continue;
      const amt = Math.abs(t.amountCents);
      const list = byAmount.get(amt) ?? [];
      list.push(t);
      byAmount.set(amt, list);
    }
    for (const [amount, list] of [...byAmount.entries()].sort((a, b) => a[0] - b[0])) {
      if (list.length >= RECURRING_MIN_OCCURRENCES) {
        for (const t of list) consumed.add(t.id);
        out.push({
          situation: makeSituation(
            merchant,
            "subscription",
            ++seq,
            latestPostedAt(list),
            `Recurring charge at ${merchant} (${list.length}× same amount)`,
          ),
          problemType: "subscription",
          merchant,
          amountCents: amount,
          evidenceTxnIds: list.map((t) => t.id),
        });
      }
    }
  }

  return out;
}
