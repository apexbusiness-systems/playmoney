import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api, auth } from "@/lib/playmoney/mock";
import { PMCard } from "@/components/pm/Card";
import { PMButton } from "@/components/pm/Button";
import { PMIcon } from "@/components/pm/Icon";

export const Route = createFileRoute("/app/settings")({
  head: () => ({ meta: [{ title: "Settings — PlayMoney" }] }),
  component: Settings,
});

function Settings() {
  const profile = useQuery({ queryKey: ["profile"], queryFn: () => auth.getProfile() });

  async function exportData() {
    const blob = await api.exportData();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "playmoney-export.json"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="container-pm py-12">
      <h1 className="h2-display">Settings</h1>
      <p className="mt-2 text-ink-muted">Small surface. That's the point.</p>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <PMCard>
          <p className="eyebrow text-ink-muted">Profile</p>
          <div className="mt-4 space-y-2">
            <Row k="Name" v={profile.data?.displayName ?? "—"} />
            <Row k="Email" v={profile.data?.email ?? "—"} />
            <Row k="Payout token" v={profile.data?.payoutRef ?? "—"} mono />
            <Row k="Identity" v={profile.data?.identityVerified ? "Verified" : "Pending"} />
          </div>
        </PMCard>

        <PMCard>
          <p className="eyebrow text-ink-muted">Notifications</p>
          <p className="mt-2 text-ink-muted">Only money-related events. Always.</p>
          <ul className="mt-4 space-y-2 text-sm">
            {[
              { k: "money_landed", v: "On" },
              { k: "needs_signature", v: "On" },
              { k: "marketing", v: "Never" },
            ].map((r) => (
              <li key={r.k} className="flex items-center justify-between rounded-[12px] bg-sand px-4 py-2">
                <span className="font-mono text-xs text-ink-muted">{r.k}</span>
                <span className="font-semibold">{r.v}</span>
              </li>
            ))}
          </ul>
        </PMCard>

        <PMCard>
          <p className="eyebrow text-ink-muted">Integrations</p>
          <div className="mt-4 flex items-center justify-between rounded-[12px] border border-border-l bg-sand px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-mint-chip">
                <PMIcon name="spark" />
              </span>
              <div>
                <p className="font-semibold">GitHub sync</p>
                <p className="text-xs text-ink-muted">Sync receipts repo (read-only)</p>
              </div>
            </div>
            <PMButton variant="ghostLight" className="!h-9">Connect</PMButton>
          </div>
        </PMCard>

        <PMCard>
          <p className="eyebrow text-ink-muted">Your data</p>
          <p className="mt-2 text-ink-muted">Tokens, not credentials. Export or delete at any time.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <PMButton variant="ghostLight" onClick={exportData}>Export data</PMButton>
            <button className="text-sm font-semibold text-destructive hover:underline" style={{ color: "#9C2A1A" }}>
              Delete everything
            </button>
          </div>
        </PMCard>
      </div>
    </section>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between border-t border-border-l py-2 first:border-t-0">
      <span className="text-ink-muted">{k}</span>
      <span className={mono ? "font-mono text-sm" : "font-semibold"}>{v}</span>
    </div>
  );
}