import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api, formatMoney } from "@/lib/playmoney/client";
import { StatusPill } from "@/components/pm/StatusPill";

export const Route = createFileRoute("/app/activity")({
  head: () => ({ meta: [{ title: "Activity — PlayMoney" }] }),
  component: Activity,
});

function Activity() {
  const recs = useQuery({ queryKey: ["recoveries"], queryFn: () => api.listRecoveries() });
  const fees = useQuery({ queryKey: ["fees"], queryFn: () => api.listFeeLedger() });
  const feeTotal = fees.data?.reduce((s, f) => s + f.feeAmount, 0) ?? 0;

  return (
    <section className="container-pm py-12">
      <h1 className="h2-display">Activity</h1>
      <p className="mt-2 text-ink-muted">A complete, auditable trail. Money out, our fee in.</p>

      <div className="mt-10 grid gap-10 lg:grid-cols-[3fr_2fr]">
        <div>
          <h2 className="font-display text-xl font-semibold">Recovery events</h2>
          <div className="mt-4 overflow-hidden rounded-[20px] border border-border-l bg-card shadow-card-l">
            <table className="w-full text-left text-sm">
              <thead className="bg-sand text-ink-muted">
                <tr>
                  <th className="px-5 py-3 font-semibold">Merchant</th>
                  <th className="px-5 py-3 font-semibold">Reason</th>
                  <th className="whitespace-nowrap px-5 py-3 font-semibold text-right">
                    Net to you
                  </th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {recs.data?.map((r) => (
                  <tr key={r.id} className="border-t border-border-l">
                    <td className="px-5 py-4 font-semibold">{r.merchant}</td>
                    <td className="px-5 py-4 text-ink-muted">{r.reason}</td>
                    <td className="px-5 py-4 text-right font-display tabular">
                      {formatMoney(r.userNet)}
                    </td>
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
          <h2 className="font-display text-xl font-semibold">Our fee ledger</h2>

          <div
            className="mt-4 rounded-[20px] border border-border-d p-6 text-text-dark"
            style={{ background: "#0E3B2D" }}
          >
            <p className="eyebrow text-muted-dark">Total paid to PlayMoney</p>
            <p
              className="mt-2 font-display tabular text-4xl font-semibold"
              style={{ color: "#F2C24B" }}
            >
              {fees.data ? formatMoney(feeTotal) : "—"}
            </p>
            <p className="mt-2 text-sm text-muted-dark">
              Across {fees.data?.length ?? 0} landed{" "}
              {(fees.data?.length ?? 0) === 1 ? "recovery" : "recoveries"} · 20% only on what you
              keep.
            </p>
          </div>

          <div className="mt-4 space-y-2">
            {fees.data?.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between rounded-[14px] border border-border-l bg-card px-5 py-3 text-sm"
              >
                <span className="text-ink-muted">{new Date(f.ts).toLocaleDateString()}</span>
                <span className="font-display tabular font-semibold text-evergreen">
                  {formatMoney(f.feeAmount)}
                </span>
              </div>
            ))}
            {fees.data?.length === 0 && (
              <p className="text-sm text-ink-muted">No fees yet — we only get paid when you do.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
