import { createServerFn } from "@tanstack/react-start";
import type { RecoveryAvenue } from "@/lib/playmoney/types";

// Simulated recovery situations returned by Flinks/Plaid ingest
export const getSituationsFn = createServerFn({ method: "GET" }).handler(async () => {
  // Return mock situations to build out the UI pipeline
  return [
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
  ] as import("@/lib/engine/situation").DetectedSituation[];
});
