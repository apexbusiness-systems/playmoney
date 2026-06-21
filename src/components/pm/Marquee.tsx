import { liveWins } from "@/lib/playmoney/mock";
import { useFormatMoney } from "@/lib/playmoney/currency";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { translateReason } from "@/lib/i18n/messages";

type Win = (typeof liveWins)[number];

function WinChip({ w }: { w: Win }) {
  const fmt = useFormatMoney();
  const { locale, t } = useI18n();
  const recoveredLabel = locale === "fr" ? "a récupéré" : "recovered";

  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-border-d px-4 py-2 text-sm text-text-dark">
      <span className="h-1.5 w-1.5 rounded-full bg-gold-num" />
      <span className="font-medium">
        {w.name} {recoveredLabel}
      </span>
      <span className="font-display tabular font-semibold text-gold-num">{fmt(w.amount)}</span>
      <span className="text-muted-dark">· {translateReason(w.reason, t)}</span>
    </span>
  );
}

export function WinsMarquee() {
  const { t } = useI18n();
  return (
    <div className="marquee overflow-hidden" role="region" aria-label={t("landing.ding.eyebrow")}>
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
