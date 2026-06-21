import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/playmoney/client";
import { useFormatMoney } from "@/lib/playmoney/currency";
import { StatusPill } from "@/components/pm/StatusPill";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { translateReason } from "@/lib/i18n/messages";

export const Route = createFileRoute("/app/activity")({
  head: () => ({ meta: [{ title: "Activity — PlayMoney" }] }),
  component: Activity,
});

function Activity() {
  const recs = useQuery({ queryKey: ["recoveries"], queryFn: () => api.listRecoveries() });
  const fees = useQuery({ queryKey: ["fees"], queryFn: () => api.listFeeLedger() });
  const feeTotal = fees.data?.reduce((s, f) => s + f.feeAmount, 0) ?? 0;
  const fmt = useFormatMoney();
  const { t, locale } = useI18n();

  const recoveriesLabel =
    (fees.data?.length ?? 0) === 1
      ? t("app.activity.recoverySingular")
      : t("app.activity.recoveryPlural");

  return (
    <section className="container-pm py-12">
      <h1 className="h2-display">{t("app.activity.title")}</h1>
      <p className="mt-2 text-ink-muted">{t("app.activity.desc")}</p>

      <div className="mt-10 grid gap-10 lg:grid-cols-[3fr_2fr]">
        <div>
          <h2 className="font-display text-xl font-semibold">{t("app.activity.recoveryEvents")}</h2>

          {/* Mobile: stacked cards — a 4-column table can't fit 390px without a
              sideways scroll, so below sm we render each event as its own card. */}
          <div className="mt-4 space-y-3 sm:hidden">
            {recs.data?.map((r) => (
              <div
                key={r.id}
                className="rounded-[16px] border border-border-l bg-card p-4 shadow-card-l"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 font-semibold">{r.merchant}</p>
                  <p className="shrink-0 font-display tabular font-semibold">{fmt(r.userNet)}</p>
                </div>
                <div className="mt-1 flex items-end justify-between gap-3">
                  <p className="min-w-0 text-sm text-ink-muted">{translateReason(r.reason, t)}</p>
                  <span className="shrink-0">
                    <StatusPill status={r.status} />
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* sm+ : the auditable table. overflow-x-auto is a belt-and-braces
              guard so even very long reasons scroll the table, never the page. */}
          <div className="mt-4 hidden overflow-x-auto rounded-[20px] border border-border-l bg-card shadow-card-l sm:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-sand text-ink-muted">
                <tr>
                  <th className="px-5 py-3 font-semibold">{t("app.activity.tableMerchant")}</th>
                  <th className="px-5 py-3 font-semibold">{t("app.activity.tableReason")}</th>
                  <th className="whitespace-nowrap px-5 py-3 text-right font-semibold">
                    {t("app.activity.tableNet")}
                  </th>
                  <th className="px-5 py-3 font-semibold">{t("app.activity.tableStatus")}</th>
                </tr>
              </thead>
              <tbody>
                {recs.data?.map((r) => (
                  <tr key={r.id} className="border-t border-border-l">
                    <td className="px-5 py-4 font-semibold">{r.merchant}</td>
                    <td className="px-5 py-4 text-ink-muted">{translateReason(r.reason, t)}</td>
                    <td className="px-5 py-4 text-right font-display tabular">{fmt(r.userNet)}</td>
                    <td className="px-5 py-4">
                      <StatusPill status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:sticky lg:top-24 self-start">
          <h2 className="font-display text-xl font-semibold">{t("app.activity.feeLedger")}</h2>

          <div
            className="mt-4 rounded-[20px] border border-border-d p-6 text-text-dark"
            style={{ background: "#0E3B2D" }}
          >
            <p className="eyebrow text-muted-dark">{t("app.activity.feeTotalLabel")}</p>
            <p
              className="mt-2 font-display tabular text-4xl font-semibold"
              style={{ color: "#F2C24B" }}
            >
              {fees.data ? fmt(feeTotal) : "—"}
            </p>
            <p className="mt-2 text-sm text-muted-dark">
              {t("app.activity.feeSummary", { count: fees.data?.length ?? 0, recoveriesLabel })}
            </p>
          </div>

          <div className="mt-4 space-y-2">
            {fees.data?.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between rounded-[14px] border border-border-l bg-card px-5 py-3 text-sm"
              >
                <span className="text-ink-muted">
                  {new Date(f.ts).toLocaleDateString(locale === "fr" ? "fr-CA" : "en-CA")}
                </span>
                <span className="font-display tabular font-semibold text-evergreen">
                  {fmt(f.feeAmount)}
                </span>
              </div>
            ))}
            {fees.data?.length === 0 && (
              <p className="text-sm text-ink-muted">{t("app.activity.noFees")}</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
