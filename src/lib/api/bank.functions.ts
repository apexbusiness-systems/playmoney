import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Simulated server function. In a real environment, this talks to Flinks API.
export const ingestTransactionsFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ aggregatorToken: z.string() }))
  .handler(async ({ data }) => {
    // Note: To remain true to P3, this should eventually hit FlinksAccountDataAdapter.
    // For now, returning success so the UI flow completes.
    return { success: true, situationCount: 3 };
  });

export const getFlinksConnectUrlFn = createServerFn({ method: "GET" }).handler(async () => {
  // A mock OAuth connect URL
  return { connectUrl: "https://mock.flinks.com/connect?client_id=playmoney" };
});
