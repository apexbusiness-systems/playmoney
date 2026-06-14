import { liveWins, formatMoney } from "@/lib/playmoney/mock";

export function WinsMarquee() {
  const items = [...liveWins, ...liveWins];
  return (
    <div className="overflow-hidden">
      <div className="marquee-track flex w-max gap-3">
        {items.map((w, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-border-d px-4 py-2 text-sm text-text-dark"
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#F2C24B" }} />
            <span className="font-medium">{w.name} recovered</span>
            <span className="font-display tabular font-semibold" style={{ color: "#F2C24B" }}>
              {formatMoney(w.amount)}
            </span>
            <span className="text-muted-dark">· {w.reason}</span>
          </span>
        ))}
      </div>
    </div>
  );
}