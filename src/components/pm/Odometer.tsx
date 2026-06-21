import { useEffect, useState } from "react";
import { animate, useReducedMotion } from "framer-motion";
import { useCurrency } from "@/lib/playmoney/currency";
import { useI18n } from "@/lib/i18n/I18nProvider";

interface Props {
  valueCents: number;
  duration?: number;
  className?: string;
  prefix?: string;
  startFrom?: number;
}

export function Odometer({ valueCents, duration = 2400, className, startFrom = 0.62 }: Props) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(reduce ? valueCents : Math.round(valueCents * startFrom));

  useEffect(() => {
    if (reduce) {
      setDisplay(valueCents);
      return;
    }
    const controls = animate(Math.round(valueCents * startFrom), valueCents, {
      duration: duration / 1000,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [valueCents, duration, reduce, startFrom]);

  const currency = useCurrency();
  const { locale } = useI18n();
  const lang = locale === "fr" ? "fr-CA" : currency === "USD" ? "en-US" : "en-CA";
  const parts = new Intl.NumberFormat(lang, { style: "currency", currency }).formatToParts(
    display / 100,
  );

  return (
    <span className={`tabular ${className ?? ""}`}>
      {parts.map((part, i) => {
        const isDecimalOrFraction = part.type === "decimal" || part.type === "fraction";
        return (
          <span key={i} style={isDecimalOrFraction ? { opacity: 0.85 } : undefined}>
            {part.value}
          </span>
        );
      })}
    </span>
  );
}
