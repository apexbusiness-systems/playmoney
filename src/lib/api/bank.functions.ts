// P4 · Bank-connect + transaction-ingest server fns — real adapter wiring, honestly sealed.
//
// These server fns drive the read-only bank flow (Flinks CA / Plaid US). They call
// the REAL AccountDataPort adapter (src/lib/adapters/account-data.ts), which seals
// itself in BUILT via assertModeIsLive()/assertLiveAllowed() before any HTTP request
// leaves the process. We do NOT weaken that seal — instead we CATCH the typed
// LiveModeBlockedError and return an honest `sealed_until_live` result so the UI shows
// "coming soon" rather than a fabricated success or an unhandled 500.
//
// The real work lives in pure helpers (ingestThroughAdapter / buildFlinksConnectUrl)
// so it is unit-testable without the server-fn runtime; the createServerFn handlers are
// thin wrappers that read process.env INSIDE the handler (per-request edge binding,
// house rule #6), mirroring how payment.functions.ts sources STRIPE_SECRET_KEY.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { ConnectUrlResult, IngestResult } from "@/lib/playmoney/types";

export interface AccountDataConfig {
  flinksUrl?: string;
  flinksClientId?: string;
  plaidClientId?: string;
  plaidSecret?: string;
  plaidEnv?: "sandbox" | "production";
}

const SEALED_MESSAGE = "Bank connection opens once PlayMoney is live in your region.";

/** Reads aggregator config from per-request env (never module scope). */
function readAccountDataConfig(): AccountDataConfig {
  return {
    flinksUrl: process.env.FLINKS_API_URL,
    flinksClientId: process.env.FLINKS_CLIENT_ID,
    plaidClientId: process.env.PLAID_CLIENT_ID,
    plaidSecret: process.env.PLAID_SECRET,
    plaidEnv: process.env.PLAID_ENV === "production" ? "production" : "sandbox",
  };
}

/**
 * Pure ingest path: invoke the REAL AccountDataPort adapter, then derive recoverable
 * situations from the returned transactions. Sealed in BUILT — the adapter throws
 * LiveModeBlockedError, which we translate into a typed `sealed_until_live`. Any OTHER
 * error is a genuine failure and propagates. Unit-testable without the server runtime.
 */
export async function ingestThroughAdapter(input: {
  aggregatorToken: string;
  config: AccountDataConfig;
}): Promise<IngestResult> {
  const { createAccountDataAdapter } = await import("@/lib/adapters/account-data");
  const { deriveSituations } = await import("@/lib/engine/situation");
  const { LiveModeBlockedError } = await import("@/lib/compliance/mode");

  const adapter = createAccountDataAdapter(input.config);
  try {
    // Real adapter call. In BUILT this throws LiveModeBlockedError before any HTTP I/O.
    const txns = await adapter.listTransactions({ aggregatorToken: input.aggregatorToken });
    const situations = deriveSituations([...txns]);
    return { ok: true, situationCount: situations.length };
  } catch (err) {
    // Honest seal: the adapter refused because we are not LIVE — surface it as a typed
    // result, not a thrown 500. Any OTHER error is a real failure and must propagate.
    if (err instanceof LiveModeBlockedError) {
      return { ok: false, code: "sealed_until_live", message: SEALED_MESSAGE };
    }
    throw err;
  }
}

/**
 * Pure Flinks Connect URL builder. This is URL construction (no live API call), so it
 * is not gated by assertLiveAllowed — but when Flinks is not configured (BUILT, no
 * creds) there is no real URL to hand out, so we return the honest `sealed_until_live`
 * result instead of a dead placeholder.
 */
export function buildFlinksConnectUrl(config: {
  apiUrl?: string;
  clientId?: string;
}): ConnectUrlResult {
  if (!config.apiUrl || !config.clientId) {
    return { ok: false, code: "sealed_until_live", message: SEALED_MESSAGE };
  }
  const qs = new URLSearchParams({ clientId: config.clientId, redirectUrl: "/bank/callback" });
  return { ok: true, connectUrl: `${config.apiUrl}/v2/${config.clientId}/connect?${qs}` };
}

export const ingestTransactionsFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ aggregatorToken: z.string() }))
  .handler(
    async ({ data }): Promise<IngestResult> =>
      ingestThroughAdapter({
        aggregatorToken: data.aggregatorToken,
        config: readAccountDataConfig(),
      }),
  );

export const getFlinksConnectUrlFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<ConnectUrlResult> =>
    buildFlinksConnectUrl({
      apiUrl: process.env.FLINKS_API_URL,
      clientId: process.env.FLINKS_CLIENT_ID,
    }),
);
