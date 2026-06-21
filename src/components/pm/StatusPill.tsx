import type { RecoveryStatus } from "@/lib/playmoney/types";
import { useI18n } from "@/lib/i18n/I18nProvider";

const map: Record<RecoveryStatus, { bg: string; fg: string; dot: string }> = {
  found: { bg: "#F4EEE1", fg: "#1C1813", dot: "#6A6354" },
  needs_approval: { bg: "#FFF3D9", fg: "#5C4108", dot: "#E6A92E" },
  on_the_way: { bg: "#E7F0EA", fg: "#0E3B2D", dot: "#2E8A66" },
  landed: { bg: "#0E3B2D", fg: "#F2C24B", dot: "#F2C24B" },
};

const labelsFr: Record<RecoveryStatus, string> = {
  found: "Trouvé",
  needs_approval: "En attente",
  on_the_way: "En cours",
  landed: "Reçu",
};

const labelsEn: Record<RecoveryStatus, string> = {
  found: "Found",
  needs_approval: "Awaiting your OK",
  on_the_way: "On the way",
  landed: "Landed",
};

export function StatusPill({ status }: { status: RecoveryStatus }) {
  const s = map[status];
  const { locale } = useI18n();
  const label = locale === "fr" ? labelsFr[status] : labelsEn[status];

  return (
    <span
      className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
      style={{ background: s.bg, color: s.fg, letterSpacing: 0.2 }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.dot }} />
      {label}
    </span>
  );
}
