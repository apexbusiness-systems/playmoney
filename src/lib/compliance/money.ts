// Non-custodial by TYPE (Controls #1, #2, #5 — Rev.3).
//
// THE INVARIANT: the only legal destination for recovered funds is the USER'S
// OWN external payout reference. PlayMoney has NO type that can hold, pool,
// escrow, or route user funds, and NO way to net a fee out of funds in transit.
// Custody is therefore a compile-time impossibility — there is nothing here to
// construct an FBO / escrow / pooled / wallet / stored-value balance with.
//
// If you ever feel the need to add a "PlayMoney holds the money" type, STOP:
// that is abort-trigger #1. The fee is always a SEPARATE merchant charge to the
// user (see FeeCharge below), never a deduction from a recovery payout.

declare const __brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [__brand]: B };

/** Integer cents. Money is never a float. */
export type Cents = Brand<number, "Cents">;

export function cents(n: number): Cents {
  if (!Number.isInteger(n)) throw new Error(`Cents must be an integer, got ${n}`);
  if (n < 0) throw new Error(`Cents must be non-negative, got ${n}`);
  return n as Cents;
}

/**
 * Opaque, tokenised reference to the USER'S OWN payout destination (e.g. a PSP
 * payout token). NEVER raw bank credentials. This is the ONLY recovery
 * destination type the system recognises.
 */
export type UserPayoutRef = Brand<string, "UserPayoutRef">;

// Patterns that look like raw bank credentials / PII we must never accept here.
const RAW_CREDENTIAL_PATTERNS: RegExp[] = [
  /\b\d{9,17}\b/, // raw account/routing-like number runs
  /password|secret|cvv|cvc/i,
];

export function userPayoutRef(token: string): UserPayoutRef {
  const t = token.trim();
  if (!t) throw new Error("UserPayoutRef cannot be empty");
  for (const re of RAW_CREDENTIAL_PATTERNS) {
    if (re.test(t)) {
      throw new Error("UserPayoutRef must be a tokenised reference, never raw credentials");
    }
  }
  return t as UserPayoutRef;
}

/** The ONLY destination a recovery payout may target: the user's own account. */
export type RecoveryDestination = UserPayoutRef;

/**
 * A fee charge is a FRESH merchant charge against the user's payment method via
 * a registered PSP (Control #4). It deliberately shares NO settlement linkage
 * with the recovery payout path — there is no field here that could net a fee
 * out of funds in transit (Control #2). It references the recovery only by id,
 * for causation/audit (Control #13), never for money movement.
 */
export interface FeeCharge {
  readonly recoveryId: string; // audit/causation link ONLY — not a money path
  readonly amount: Cents; // charged to the user's card via PSP, separately
  readonly idempotencyKey: string;
}
