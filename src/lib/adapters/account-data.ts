// P4 · AccountDataPort adapters — Flinks CA + Plaid US (read-only).
//
// Both adapters are sealed in BUILT: every real outbound call is guarded by
// assertLiveAllowed() (#2). In BUILT mode they throw LiveModeBlockedError before
// any HTTP request leaves the process. Concrete impls live here; secrets come from
// env.server.ts only, never from module scope (per-request binding).
//
// No credential storage: aggregator tokens are OAuth-scoped, short-lived, passed
// in per call. No payment-initiation capability: AccountDataPort has no method
// that moves money (#3).

import type { AccountDataPort, BankTransaction } from "@/lib/compliance/ports";
import { assertLiveAllowed, assertModeIsLive } from "@/lib/compliance/mode";
import { loadGateStatus } from "@/lib/compliance/gates.server";

// ── Shared HTTP helper (typed, no `any`) ──────────────────────────────────────
async function fetchJson<T>(url: string, init: RequestInit, label: string): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new Error(`${label}: HTTP ${res.status} — ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

// ── Flinks CA adapter (read-only bank data, Alberta MVP) ─────────────────────
interface FlinksRawTx {
  Id: string;
  PostedDate: string;
  Amount: number;
  Description: string;
  Merchant?: string;
}
interface FlinksAccountResponse {
  Accounts?: Array<{ Transactions?: FlinksRawTx[] }>;
}

export class FlinksAccountDataAdapter implements AccountDataPort {
  constructor(
    private readonly apiUrl: string,
    private readonly clientId: string,
  ) {}

  async listTransactions(input: {
    aggregatorToken: string;
    since?: string;
  }): Promise<ReadonlyArray<BankTransaction>> {
    assertModeIsLive(); // fast I/O-free BUILT seal; avoids Supabase call in CI
    const gates = await loadGateStatus();
    assertLiveAllowed(gates);

    const qs = new URLSearchParams({ loginId: input.aggregatorToken });
    if (input.since) qs.set("fromDate", input.since);

    const data = await fetchJson<FlinksAccountResponse>(
      `${this.apiUrl}/v3/${this.clientId}/BankingServices/GetAccountsSummaryAsync?${qs}`,
      { headers: { "Content-Type": "application/json" } },
      "FlinksAccountDataAdapter.listTransactions",
    );

    const txns: BankTransaction[] = [];
    for (const acct of data.Accounts ?? []) {
      for (const raw of acct.Transactions ?? []) {
        txns.push({
          id: raw.Id,
          postedAt: raw.PostedDate,
          amountCents: Math.round(Math.abs(raw.Amount) * 100),
          merchant: raw.Merchant ?? raw.Description,
          description: raw.Description,
        });
      }
    }
    return txns;
  }
}

// ── Plaid US adapter (read-only, deferred — assertLiveAllowed + geofence block) ─
interface PlaidRawTx {
  transaction_id: string;
  date: string;
  amount: number;
  merchant_name: string | null;
  name: string;
}
interface PlaidTransactionsResponse {
  transactions?: PlaidRawTx[];
}

export class PlaidAccountDataAdapter implements AccountDataPort {
  constructor(
    private readonly env: "sandbox" | "production",
    private readonly clientId: string,
    private readonly secret: string,
  ) {}

  async listTransactions(input: {
    aggregatorToken: string;
    since?: string;
  }): Promise<ReadonlyArray<BankTransaction>> {
    assertModeIsLive(); // fast I/O-free BUILT seal; avoids Supabase call in CI
    const gates = await loadGateStatus();
    // US jurisdiction is deferred (G-geofence gate) — assertLiveAllowed will
    // also throw because us_recovery avenue is disabled at the registry level.
    // The extra assertLiveAllowed here is belt-and-suspenders.
    assertLiveAllowed(gates);

    const body = {
      client_id: this.clientId,
      secret: this.secret,
      access_token: input.aggregatorToken,
      start_date: input.since ?? "2020-01-01",
      end_date: new Date().toISOString().slice(0, 10),
    };

    const data = await fetchJson<PlaidTransactionsResponse>(
      `https://${this.env}.plaid.com/transactions/get`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
      "PlaidAccountDataAdapter.listTransactions",
    );

    return (data.transactions ?? []).map((raw) => ({
      id: raw.transaction_id,
      postedAt: raw.date,
      amountCents: Math.round(Math.abs(raw.amount) * 100),
      merchant: raw.merchant_name ?? raw.name,
      description: raw.name,
    }));
  }
}

// ── Factory: selects adapter by env config; sealed in BUILT at the call site ──
export function createAccountDataAdapter(config: {
  flinksUrl?: string;
  flinksClientId?: string;
  plaidClientId?: string;
  plaidSecret?: string;
  plaidEnv?: "sandbox" | "production";
}): AccountDataPort {
  if (config.flinksUrl && config.flinksClientId) {
    return new FlinksAccountDataAdapter(config.flinksUrl, config.flinksClientId);
  }
  if (config.plaidClientId && config.plaidSecret) {
    return new PlaidAccountDataAdapter(
      config.plaidEnv ?? "sandbox",
      config.plaidClientId,
      config.plaidSecret,
    );
  }
  // No adapter configured — return a sealed stub that always throws in BUILT.
  return {
    async listTransactions() {
      assertModeIsLive(); // fast I/O-free BUILT seal; avoids Supabase call in CI
      const gates = await loadGateStatus();
      assertLiveAllowed(gates); // throws LiveModeBlockedError in BUILT
      throw new Error("No AccountDataPort adapter configured");
    },
  };
}
