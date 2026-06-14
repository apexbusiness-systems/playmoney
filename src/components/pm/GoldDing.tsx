import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";

interface Props {
  trigger?: number;
  loop?: boolean;
  /** Maximum pulse cycles before the loop goes quiet. */
  maxLoops?: number;
  children: ReactNode;
  color?: string;
}

export function GoldDing({
  trigger = 0,
  loop = false,
  maxLoops = 3,
  children,
  color = "#F2C24B",
}: Props) {
  const reduce = useReducedMotion();
  const [tick, setTick] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loop || reduce) return;
    const el = containerRef.current;
    if (!el) return;

    let count = 0;
    let intervalId: number | undefined;

    const start = () => {
      if (intervalId || count >= maxLoops) return;
      intervalId = window.setInterval(() => {
        count += 1;
        setTick((t) => t + 1);
        if (count >= maxLoops && intervalId) {
          window.clearInterval(intervalId);
          intervalId = undefined;
        }
      }, 3200);
    };
    const stop = () => {
      if (intervalId) {
        window.clearInterval(intervalId);
        intervalId = undefined;
      }
    };

    // Only pulse while the element is on screen, and never beyond maxLoops total.
    const io = new IntersectionObserver(
      (entries) => (entries[0]?.isIntersecting ? start() : stop()),
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      stop();
    };
  }, [loop, reduce, maxLoops]);

  const key = loop ? tick : trigger;

  return (
    <div ref={containerRef} className="relative inline-flex items-center justify-center">
      <AnimatePresence>{!reduce && <RingsBurst key={key} color={color} />}</AnimatePresence>
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
    <div
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
      aria-hidden
    >
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
