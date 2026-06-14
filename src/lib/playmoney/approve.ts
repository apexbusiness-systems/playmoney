import type { QueryClient } from "@tanstack/react-query";
import type { Recovery } from "./types";

export const RECOVERIES_KEY = ["recoveries"] as const;
export const TOTALS_KEY = ["totals"] as const;

/**
 * Optimistically mark a recovery as `on_the_way`, run the real approval, and —
 * critically — roll the cache back to its previous state if the approval fails.
 *
 * Extracted from the Wins page so the optimistic/rollback contract is unit-testable
 * without a DOM. The previous inline version had no failure path: a thrown approval
 * left the card stuck on "On the way" and the totals wrong, with no signal to the user.
 */
export async function approveRecovery({
  qc,
  rec,
  run,
}: {
  qc: QueryClient;
  rec: Recovery;
  run: () => Promise<unknown>;
}): Promise<void> {
  const previous = qc.getQueryData<Recovery[]>(RECOVERIES_KEY);

  // Optimistic update.
  qc.setQueryData<Recovery[]>(RECOVERIES_KEY, (old) =>
    old?.map((r) => (r.id === rec.id ? { ...r, status: "on_the_way" } : r)),
  );

  try {
    await run();
    await qc.invalidateQueries({ queryKey: RECOVERIES_KEY });
    await qc.invalidateQueries({ queryKey: TOTALS_KEY });
  } catch (err) {
    // Roll back to exactly what was there before the optimistic write.
    if (previous !== undefined) {
      qc.setQueryData<Recovery[]>(RECOVERIES_KEY, previous);
    }
    throw err;
  }
}
