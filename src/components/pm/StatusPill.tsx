import type { RecoveryStatus } from "@/lib/playmoney/types";

const map: Record<RecoveryStatus, { label: string; bg: string; fg: string; dot: string }> = {
  found: { label: "Found", bg: "#F4EEE1", fg: "#1C1813", dot: "#6A6354" },
  needs_approval: { label: "Awaiting your OK", bg: "#FFF3D9", fg: "#5C4108", dot: "#E6A92E" },
  on_the_way: { label: "On the way", bg: "#E7F0EA", fg: "#0E3B2D", dot: "#2E8A66" },
  landed: { label: "Landed", bg: "#0E3B2D", fg: "#F2C24B", dot: "#F2C24B" },
};

export function StatusPill({ status }: { status: RecoveryStatus }) {
  const s = map[status];
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
      style={{ background: s.bg, color: s.fg, letterSpacing: 0.2 }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.dot }} />
      {s.label}
    </span>
  );
}