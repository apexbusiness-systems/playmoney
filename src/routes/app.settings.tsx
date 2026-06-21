import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api, auth } from "@/lib/playmoney/client";
import { PMCard } from "@/components/pm/Card";
import { PMButton } from "@/components/pm/Button";

import { toast } from "sonner";

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
    a.href = url;
    a.download = "playmoney-export.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleDeleteAll() {
    if (!window.confirm("Are you sure you want to delete all your data? This cannot be undone."))
      return;
    try {
      await api.deleteAllData();
      toast.success("All data deleted");
      window.location.reload();
    } catch (err) {
      toast.error("Failed to delete data", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    }
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
              { label: "Money arrived", desc: "When a refund or fee lands", v: "On" },
              { label: "Action needed", desc: "When your signature is required", v: "On" },
              { label: "Promotions", desc: "Tips, offers, and marketing", v: "Never" },
            ].map((r) => (
              <li
                key={r.label}
                className="flex items-center justify-between rounded-[12px] bg-sand px-4 py-3"
              >
                <div>
                  <p className="font-medium text-ink">{r.label}</p>
                  <p className="text-xs text-ink-muted">{r.desc}</p>
                </div>
                <span className="font-semibold">{r.v}</span>
              </li>
            ))}
          </ul>
        </PMCard>

        <PMCard>
          <p className="eyebrow text-ink-muted">Your data</p>
          <p className="mt-2 text-ink-muted">
            Tokens, not credentials. Export or delete at any time.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <PMButton variant="ghostLight" onClick={exportData}>
              Export data
            </PMButton>
            <button
              onClick={handleDeleteAll}
              className="cursor-pointer text-sm font-semibold hover:underline"
              style={{ color: "#9C2A1A" }}
            >
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
