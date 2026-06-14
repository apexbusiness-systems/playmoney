import type { SVGProps } from "react";

type Name = "coin" | "envelope" | "receipt" | "shield" | "bell" | "check" | "spark" | "arrow";

const STROKE = "#0E3B2D";

export function PMIcon({ name, ...rest }: { name: Name } & SVGProps<SVGSVGElement>) {
  const common = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: STROKE,
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...rest,
  };
  switch (name) {
    case "coin":
      return (
        <svg {...common}>
          <ellipse cx="12" cy="7" rx="7" ry="3" />
          <path d="M5 7v6c0 1.7 3.1 3 7 3s7-1.3 7-3V7" />
          <path d="M5 13v4c0 1.7 3.1 3 7 3s7-1.3 7-3v-4" />
        </svg>
      );
    case "envelope":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3 7 9 6 9-6" />
        </svg>
      );
    case "receipt":
      return (
        <svg {...common}>
          <path d="M5 3h14v18l-3-2-3 2-3-2-3 2-2-2V3z" />
          <path d="M8 8h8M8 12h8M8 16h5" />
        </svg>
      );
    case "shield":
      return (
        <svg {...common}>
          <path d="M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6l-7-3z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );
    case "bell":
      return (
        <svg {...common}>
          <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2H4.5L6 16z" />
          <path d="M10 20a2 2 0 0 0 4 0" />
        </svg>
      );
    case "check":
      return (
        <svg {...common}>
          <path d="m5 12 4 4L19 7" />
        </svg>
      );
    case "spark":
      return (
        <svg {...common}>
          <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l3 3M15 15l3 3M6 18l3-3M15 9l3-3" />
        </svg>
      );
    case "arrow":
      return (
        <svg {...common}>
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      );
  }
}

export function IconChip({ name, size = 44 }: { name: Name; size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-full bg-mint-chip"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <PMIcon name={name} />
    </span>
  );
}