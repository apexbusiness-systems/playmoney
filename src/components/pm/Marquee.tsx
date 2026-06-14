import { liveWins, formatMoney } from "@/lib/playmoney/mock";

type Win = (typeof liveWins)[number];

function WinChip({ w }: { w: Win }) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-border-d px-4 py-2 text-sm text-text-dark">
      <span className="h-1.5 w-1.5 rounded-full bg-gold-num" />
      <span className="font-medium">{w.name} recovered</span>
      <span className="font-display tabular font-semibold text-gold-num">
        {formatMoney(w.amount)}
      </span>
      <span className="text-muted-dark">· {w.reason}</span>
    </span>
  );
}

export function WinsMarquee() {
  return (
    <div
      className="marquee overflow-hidden"
      role="region"
      aria-label="Recent recoveries from PlayMoney members"
    >
      <div className="marquee-track flex w-max gap-3">
        {/* Announced once. */}
        <ul className="m-0 flex w-max list-none gap-3 p-0">
          {liveWins.map((w, i) => (
            <li key={i}>
              <WinChip w={w} />
            </li>
          ))}
        </ul>
        {/* Visual duplicate for seamless looping — hidden from assistive tech. */}
        <ul className="m-0 flex w-max list-none gap-3 p-0" aria-hidden="true">
          {liveWins.map((w, i) => (
            <li key={`dup-${i}`}>
              <WinChip w={w} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
