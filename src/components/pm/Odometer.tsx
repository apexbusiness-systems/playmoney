import { useEffect, useState } from "react";
import { animate, useReducedMotion } from "framer-motion";

interface Props {
  valueCents: number;
  duration?: number;
  className?: string;
  prefix?: string;
  startFrom?: number;
}

export function Odometer({ valueCents, duration = 2400, className, prefix = "$", startFrom = 0.62 }: Props) {
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

  const dollars = (display / 100).toFixed(2);
  const [whole, dec] = dollars.split(".");
  const withCommas = Number(whole).toLocaleString("en-US");

  return (
    <span className={`tabular ${className ?? ""}`}>
      <span>{prefix}</span>
      <span>{withCommas}</span>
      <span style={{ opacity: 0.85 }}>.{dec}</span>
    </span>
  );
}