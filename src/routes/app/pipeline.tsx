import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, auth } from "@/lib/playmoney/client";
import { useFormatMoney } from "@/lib/playmoney/currency";
import { rankByContextKey } from "@/lib/engine/situation";
import { PMButton } from "@/components/pm/Button";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { translateReason } from "@/lib/i18n/messages";

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

  const { t } = useI18n();
  const context = profile.data?.context;
  const fmt = useFormatMoney();
  const sampleMode = situations.data?.sampleMode ?? false;
  const situationList = React.useMemo(() => situations.data?.situations ?? [], [situations.data]);
  const orderedSituations = React.useMemo(() => {
    if (situationList.length === 0) return [];
    if (!context) return situationList;

    // We import rankByContextKey from the engine and use it to sort the incoming situations
    // based on their avenue/problemType vs the user's occupation context.
    return rankByContextKey(situationList, (s) => s.problemType, context);
  }, [situationList, context]);

  const initiate = useMutation({
    mutationFn: (situationId: string) => api.initiateRecovery({ situationId }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["recoveries"] });
      await qc.invalidateQueries({ queryKey: ["situations"] });
      toast.success(t("app.pipeline.toastSuccess"));
      void nav({ to: "/app" });
    },
    onError: (err) => {
      toast.error(t("app.pipeline.toastError"), {
        description: err instanceof Error ? err.message : "An error occurred.",
      });
    },
  });

  return (
    <div className="container-pm py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">{t("app.pipeline.title")}</h1>
          <p className="mt-2 text-muted-dark">
            {
              situations.data?.sampleMode
                ? t(
                    "app.pipeline.sampleDesc",
                  ) /* Sample preview — these are example results. Real scanning unlocks at launch. */
                : t("app.pipeline.liveDesc") /* found by our engines */
            }
          </p>
        </div>
        {context && (
          <div className="flex items-center gap-2 text-sm text-ink-muted bg-sand px-3 py-1.5 rounded-full border border-border-l">
            <span className="h-2 w-2 rounded-full bg-mint" />
            {t("app.dashboard.prioritized")}
          </div>
        )}
      </div>

      <div className="mt-8 space-y-4">
        {situations.isLoading && <p>{t("app.pipeline.loading")}</p>}
        {orderedSituations.map((sit) => (
          <div
            key={sit.situation.id}
            className="rounded-xl border border-border-d bg-card p-6 flex items-center justify-between"
          >
            <div>
              <p className="font-semibold">{sit.merchant}</p>
              <p className="text-sm text-ink-muted">{translateReason(sit.situation.summary, t)}</p>
            </div>
            <div className="flex items-center gap-4">
              <p className="font-display text-xl font-semibold">{fmt(sit.amountCents)}</p>
              <PMButton
                variant="primaryLight"
                onClick={() => initiate.mutate(sit.situation.id)}
                disabled={initiate.isPending}
              >
                {initiate.isPending ? t("app.pipeline.btnStarting") : t("app.pipeline.btnGet")}
              </PMButton>
            </div>
          </div>
        ))}
        {situations.data && situationList.length === 0 && (
          <div className="text-center py-12 border rounded-xl bg-card">
            <p className="text-muted-dark">{t("app.pipeline.empty")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
