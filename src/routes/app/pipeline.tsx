import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, auth, formatMoney } from "@/lib/playmoney/client";
import { rankByContextKey } from "@/lib/engine/situation";
import { PMButton } from "@/components/pm/Button";

export const Route = createFileRoute("/app/pipeline")({
  head: () => ({ meta: [{ title: "Found Refunds — PlayMoney" }] }),
  component: PipelinePage,
});

function PipelinePage() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const profile = useQuery({ queryKey: ["profile"], queryFn: () => auth.getProfile() });
  const situations = useQuery({
    queryKey: ["situations"],
    queryFn: async () => {
      const { getSituationsFn } = await import("@/lib/api/situations.functions");
      return getSituationsFn();
    },
  });

  const context = profile.data?.context;
  const orderedSituations = React.useMemo(() => {
    if (!situations.data) return [];
    if (!context) return situations.data;

    // We import rankByContextKey from the engine and use it to sort the incoming situations
    // based on their avenue/problemType vs the user's occupation context.
    return rankByContextKey(situations.data, (s) => s.problemType, context);
  }, [situations.data, context]);

  const initiate = useMutation({
    mutationFn: (situationId: string) => api.initiateRecovery({ situationId }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["recoveries"] });
      await qc.invalidateQueries({ queryKey: ["situations"] });
      toast.success("Recovery pipeline started");
      void nav({ to: "/app" });
    },
    onError: (err) => {
      toast.error("Failed to start recovery", {
        description: err instanceof Error ? err.message : "An error occurred.",
      });
    },
  });

  return (
    <div className="container-pm py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">Found Refunds</h1>
          <p className="mt-2 text-muted-dark">
            These situations were found by our engines in your bank history.
          </p>
        </div>
        {context && (
          <div className="flex items-center gap-2 text-sm text-ink-muted bg-sand px-3 py-1.5 rounded-full border border-border-l">
            <span className="h-2 w-2 rounded-full bg-mint" />
            Prioritized for you
          </div>
        )}
      </div>

      <div className="mt-8 space-y-4">
        {situations.isLoading && <p>Loading...</p>}
        {orderedSituations.map((sit) => (
          <div
            key={sit.situation.id}
            className="rounded-xl border border-border-d bg-card p-6 flex items-center justify-between"
          >
            <div>
              <p className="font-semibold">{sit.merchant}</p>
              <p className="text-sm text-ink-muted">{sit.situation.summary}</p>
            </div>
            <div className="flex items-center gap-4">
              <p className="font-display text-xl font-semibold">{formatMoney(sit.amountCents)}</p>
              <PMButton
                variant="primaryLight"
                onClick={() => initiate.mutate(sit.situation.id)}
                disabled={initiate.isPending}
              >
                {initiate.isPending ? "Starting..." : "Get it back"}
              </PMButton>
            </div>
          </div>
        ))}
        {situations.data && situations.data.length === 0 && (
          <div className="text-center py-12 border rounded-xl bg-card">
            <p className="text-muted-dark">No new situations found right now.</p>
          </div>
        )}
      </div>
    </div>
  );
}
