// P4 · Detected-situations server fn — mode-aware, honestly labeled.
//
// In LIVE (mode=LIVE AND all gates green) this derives REAL situations from the
// user's ingested bank transactions via the pure SituationModel (engine/situation.ts).
// In BUILT it returns a DISCLOSED sample-preview set tagged `sampleMode: true`, so the
// UI can label it honestly ("Sample preview") instead of claiming fabricated data was
// "found in your bank history". The sample data is a designed, disclosed product-preview
// state — not deleted, because it is useful for Path-A beta; the fix is disclosure.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { RecoveryAvenue } from "@/lib/playmoney/types";
import type { DetectedSituation } from "@/lib/engine/situation";

export interface SituationsResult {
  readonly sampleMode: boolean;
  readonly situations: DetectedSituation[];
}

// Disclosed sample-preview situations (Path-A beta). Unchanged content from the prior
// hardcoded stub — only renamed and now explicitly flagged as sample data.
export const SAMPLE_SITUATIONS: DetectedSituation[] = [
  {
    situation: {
      id: "sit_001",
      merchant: "Chase Checking",
      detectedAt: "2026-06-12T12:00:00Z",
      summary: "Overdraft fee charged on May 12th",
    },
    problemType: "fee_reversal" as RecoveryAvenue,
    merchant: "Chase Checking",
    amountCents: 3500,
    evidenceTxnIds: ["txn_1"],
  },
  {
    situation: {
      id: "sit_002",
      merchant: "Netflix",
      detectedAt: "2026-06-13T12:00:00Z",
      summary: "Unused subscription since Jan 2024",
    },
    problemType: "subscription" as RecoveryAvenue,
    merchant: "Netflix",
    amountCents: 15490,
    evidenceTxnIds: ["txn_2"],
  },
  {
    situation: {
      id: "sit_003",
      merchant: "Uber",
      detectedAt: "2026-06-14T12:00:00Z",
      summary: "Duplicate ride charge detected",
    },
    problemType: "double_charge" as RecoveryAvenue,
    merchant: "Uber",
    amountCents: 5140,
    evidenceTxnIds: ["txn_3"],
  },
];

/**
 * Pure selection logic. When `isLive`, returns REAL derived situations from the
 * injected loader; otherwise returns the disclosed sample set. Unit-testable without
 * the server runtime — the live branch is exercised by toggling `isLive`.
 */
export async function getSituations(input: {
  isLive: boolean;
  loadLiveSituations: () => Promise<DetectedSituation[]>;
}): Promise<SituationsResult> {
  if (input.isLive) {
    return { sampleMode: false, situations: await input.loadLiveSituations() };
  }
  return { sampleMode: true, situations: SAMPLE_SITUATIONS };
}

export const getSituationsFn = createServerFn({ method: "GET" })
  .inputValidator(z.object({ aggregatorToken: z.string().optional() }).optional())
  .handler(async ({ data }): Promise<SituationsResult> => {
    const { getMode } = await import("@/lib/compliance/mode");

    // BUILT short-circuit: no DB gate read needed (mirrors the adapters' I/O-free seal).
    if (getMode() !== "LIVE") {
      return getSituations({ isLive: false, loadLiveSituations: async () => [] });
    }

    const { loadGateStatus } = await import("@/lib/compliance/gates.server");
    const { isLiveEnabled } = await import("@/lib/compliance/mode");
    const gates = await loadGateStatus();

    return getSituations({
      isLive: isLiveEnabled(gates),
      loadLiveSituations: async () => {
        const { createAccountDataAdapter } = await import("@/lib/adapters/account-data");
        const { deriveSituations } = await import("@/lib/engine/situation");
        const adapter = createAccountDataAdapter({
          flinksUrl: process.env.FLINKS_API_URL,
          flinksClientId: process.env.FLINKS_CLIENT_ID,
          plaidClientId: process.env.PLAID_CLIENT_ID,
          plaidSecret: process.env.PLAID_SECRET,
        });
        const txns = await adapter.listTransactions({
          aggregatorToken: data?.aggregatorToken ?? "",
        });
        return deriveSituations([...txns]);
      },
    });
  });
