import type { HTMLAttributes } from "react";

interface Props extends HTMLAttributes<HTMLDivElement> {
  tone?: "light" | "dark";
  pad?: "sm" | "md" | "lg";
}

export function PMCard({ tone = "light", pad = "md", className, ...rest }: Props) {
  const tones =
    tone === "light"
      ? "bg-card border border-border-l text-ink shadow-card-l"
      : "bg-evergreen border border-border-d text-text-dark";
  const pads = pad === "sm" ? "p-5" : pad === "lg" ? "p-10" : "p-7";
  return <div className={`rounded-[20px] ${tones} ${pads} ${className ?? ""}`} {...rest} />;
}