import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";

interface Props {
  trigger?: number;
  loop?: boolean;
  children: ReactNode;
  color?: string;
}

export function GoldDing({ trigger = 0, loop = false, children, color = "#F2C24B" }: Props) {
  const reduce = useReducedMotion();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!loop || reduce) return;
    const i = window.setInterval(() => setTick((t) => t + 1), 3200);
    return () => window.clearInterval(i);
  }, [loop, reduce]);

  const key = loop ? tick : trigger;

  return (
    <div className="relative inline-flex items-center justify-center">
      <AnimatePresence>
        {!reduce && <RingsBurst key={key} color={color} />}
      </AnimatePresence>
      <motion.div
        key={`pop-${key}`}
        initial={{ scale: 0.96 }}
        animate={{ scale: [0.96, 1.06, 1] }}
        transition={{ duration: 0.55, ease: [0.34, 1.56, 0.64, 1] }}
        className="relative"
      >
        {children}
      </motion.div>
    </div>
  );
}

function RingsBurst({ color }: { color: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          initial={{ scale: 0.6, opacity: 0.7 }}
          animate={{ scale: 2.6 + i * 0.55, opacity: 0 }}
          transition={{ delay: i * 0.09, duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: "absolute",
            width: 220,
            height: 220,
            borderRadius: 9999,
            border: `2px solid ${color}`,
            boxShadow: `0 0 40px ${color}33`,
          }}
        />
      ))}
    </div>
  );
}