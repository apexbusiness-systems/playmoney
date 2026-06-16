import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primaryLight" | "primaryDark" | "ghostDark" | "ghostLight";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const base =
  "inline-flex items-center justify-center gap-2 font-sans font-semibold transition-all duration-200 ease-out select-none disabled:opacity-50 disabled:cursor-not-allowed";

const variants: Record<Variant, string> = {
  primaryLight:
    "h-[52px] px-7 rounded-[12px] bg-green-btn text-card hover:translate-y-[-1px] hover:brightness-95 active:translate-y-0",
  primaryDark:
    "h-[52px] px-7 rounded-[12px] bg-gold text-ink hover:translate-y-[-1px] hover:brightness-95 active:translate-y-0",
  ghostDark:
    "h-[44px] px-5 rounded-full border border-border-d text-text-dark hover:bg-evergreen/60",
  ghostLight: "h-[44px] px-5 rounded-full border border-border-l text-ink hover:bg-card",
};

export const PMButton = forwardRef<HTMLButtonElement, Props>(function PMButton(
  { variant = "primaryLight", className, style, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={`${base} ${variants[variant]} ${className ?? ""}`}
      style={{
        boxShadow:
          variant === "primaryLight"
            ? "0 1px 2px rgba(20,16,10,.18), 0 8px 24px rgba(15,107,80,.25)"
            : variant === "primaryDark"
              ? "0 1px 2px rgba(0,0,0,.35), 0 8px 24px rgba(230,169,46,.25)"
              : undefined,
        ...style,
      }}
      {...rest}
    />
  );
});
