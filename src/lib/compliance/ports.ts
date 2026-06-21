// Typed, minimal ports (Controls #3, #4). Adapters CANNOT exceed these scopes.
//
// AccountDataPort: READ-ONLY bank data via an OAuth aggregator token (Flinks/
// Plaid). No credential storage, no payment-initiation capability — there is no
// method here that moves money. (#3)
//
// PayoutPort: a registered PSP merchant fee-charge ONLY. There is deliberately
// NO method to move, hold, or route a user's recovered funds — recoveries land
// in the user's own account directly (non-custodial, #1/#4). The fee is a fresh
// merchant charge, never netted from funds in transit (#2).
//
// RecoveryOutboundPort: outbound dispatch of the Recovery Communication Package
// to a merchant's dispute contact. SEALED IN BUILT — assertModeIsLive() throws
// before any real network call. Only the package builder (pure) runs in BUILT;
// the dispatch never fires until LIVE+gates. This port CANNOT move money; it
// sends text only.

export interface BankTransaction {
  readonly id: string;
  readonly postedAt: string;
  readonly amountCents: number;
  readonly merchant: string;
  readonly description: string;
}

export interface AccountDataPort {
  /** Read-only transaction history. OAuth token only; no creds, no write/init scope. */
  listTransactions(input: {
    aggregatorToken: string;
    since?: string;
  }): Promise<ReadonlyArray<BankTransaction>>;
}

export interface PayoutPort {
  /**
   * Charge the user's own payment method a FEE via a registered PSP, with
   * PlayMoney as merchant. Returns the PSP charge reference. There is no
   * parameter or return value that could move a user's recovered funds.
   */
  chargeFee(input: {
    feeCents: number;
    customerRef: string; // tokenised PSP customer ref — never raw card data
    idempotencyKey: string;
  }): Promise<{ pspChargeRef: string }>;

  /** Create a new customer in Stripe for future fee charging. */
  createStripeCustomer(input: { email: string; name: string }): Promise<{ customerRef: string }>;
}

export interface RecoveryCommPackageRef {
  readonly avenue: string;
  readonly subject: string;
  readonly body: string;
  readonly generatedAt: string;
}

export interface RecoveryOutboundPort {
  /**
   * Dispatch the Recovery Communication Package to the merchant's dispute
   * contact. Returns a dispatchRef for audit. SEALED IN BUILT — adapters
   * must call assertModeIsLive() before any real network call. There is no
   * parameter here that moves user funds; this sends text only.
   */
  sendRecoveryPackage(
    pkg: RecoveryCommPackageRef,
    destination: { email?: string; url?: string },
  ): Promise<{ dispatchRef: string }>;
}
