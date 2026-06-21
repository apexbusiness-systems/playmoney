import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api, auth } from "@/lib/playmoney/client";
import { PMCard } from "@/components/pm/Card";
import { PMButton } from "@/components/pm/Button";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n/I18nProvider";

export const Route = createFileRoute("/app/settings")({
  head: () => ({ meta: [{ title: "Settings — PlayMoney" }] }),
  component: Settings,
});

function Settings() {
  const profile = useQuery({ queryKey: ["profile"], queryFn: () => auth.getProfile() });
  const { t } = useI18n();

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
    if (!window.confirm(t("app.settings.deleteConfirm"))) return;
    try {
      await api.deleteAllData();
      toast.success(t("app.settings.deleteSuccess"));
      window.location.reload();
    } catch (err) {
      toast.error(t("app.settings.deleteFailed"), {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    }
  }

  const notificationRows = [
    {
      label: t("app.settings.notifArrivedLabel"),
      desc: t("app.settings.notifArrivedDesc"),
      v: t("app.settings.notifArrivedVal"),
    },
    {
      label: t("app.settings.notifActionLabel"),
      desc: t("app.settings.notifActionDesc"),
      v: t("app.settings.notifActionVal"),
    },
    {
      label: t("app.settings.notifPromoLabel"),
      desc: t("app.settings.notifPromoDesc"),
      v: t("app.settings.notifPromoVal"),
    },
  ];

  const profileVerifiedStatus = profile.data?.identityVerified
    ? t("app.settings.profileVerified")
    : t("app.settings.profilePending");

  return (
    <section className="container-pm py-12">
      <h1 className="h2-display">{t("app.settings.title")}</h1>
      <p className="mt-2 text-ink-muted">{t("app.settings.desc")}</p>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <PMCard>
          <p className="eyebrow text-ink-muted">{t("app.settings.profileTitle")}</p>
          <div className="mt-4 space-y-2">
            <Row k={t("app.settings.profileName")} v={profile.data?.displayName ?? "—"} />
            <Row k={t("app.settings.profileEmail")} v={profile.data?.email ?? "—"} />
            <Row k={t("app.settings.profilePayout")} v={profile.data?.payoutRef ?? "—"} mono />
            <Row k={t("app.settings.profileIdentity")} v={profileVerifiedStatus} />
          </div>
        </PMCard>

        <PMCard>
          <p className="eyebrow text-ink-muted">{t("app.settings.notifTitle")}</p>
          <p className="mt-2 text-ink-muted">{t("app.settings.notifDesc")}</p>
          <ul className="mt-4 space-y-2 text-sm">
            {notificationRows.map((r) => (
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
          <p className="eyebrow text-ink-muted">{t("app.settings.dataTitle")}</p>
          <p className="mt-2 text-ink-muted">{t("app.settings.dataDesc")}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <PMButton variant="ghostLight" onClick={exportData}>
              {t("app.settings.dataExport")}
            </PMButton>
            <button
              onClick={handleDeleteAll}
              className="cursor-pointer text-sm font-semibold hover:underline"
              style={{ color: "#9C2A1A" }}
            >
              {t("app.settings.dataDelete")}
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
