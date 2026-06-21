import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { PMIcon } from "./Icon";
import { Toaster } from "@/components/ui/sonner";

const navLinks = [
  { to: "/app", label: "Wins", icon: "coin" },
  { to: "/app/activity", label: "Activity", icon: "receipt" },
  { to: "/app/settings", label: "Settings", icon: "spark" },
] as const;

// Muted ink (#6A6354) for inactive tab glyphs; active uses the default evergreen.
const INACTIVE = "#6A6354";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="min-h-screen bg-sand text-ink">
      <header
        className="sticky top-0 z-30 border-b backdrop-blur"
        style={{ background: "#0E3B2D", borderColor: "#1E5A45" }}
      >
        <div className="container-pm flex h-16 items-center justify-between">
          <Link to="/" className="inline-flex items-center" aria-label="PlayMoney home">
            <img
              src="/wordmark.png"
              alt="PlayMoney"
              className="h-8 w-auto"
              width={148}
              height={32}
            />
          </Link>
          {/* Desktop/tablet: inline pill nav. On mobile this collapses to the
              bottom tab bar below so the header never overflows. */}
          <nav className="hidden items-center gap-1 sm:flex">
            {navLinks.map((l) => {
              const active = pathname === l.to;
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-white/15 text-text-dark"
                      : "text-text-dark/70 hover:bg-white/10 hover:text-text-dark"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10"
              aria-label="Notifications"
            >
              <PMIcon name="bell" stroke="#F4EEE1" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-gold" />
            </button>
            <span
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 font-display text-text-dark"
              aria-label="Account: Maya Chen"
            >
              M
            </span>
          </div>
        </div>
      </header>

      {/* Extra bottom padding on mobile so content clears the fixed tab bar. */}
      <main className="pb-[calc(4.5rem+env(safe-area-inset-bottom))] sm:pb-0">{children}</main>

      {/* Mobile bottom tab bar — iOS-native pattern, replaces the header nav. */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border-l bg-card/95 backdrop-blur sm:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto flex max-w-lg items-stretch justify-around">
          {navLinks.map((l) => {
            const active = pathname === l.to;
            return (
              <Link
                key={l.to}
                to={l.to}
                aria-current={active ? "page" : undefined}
                className={`flex flex-1 flex-col items-center gap-1 px-2 pt-2.5 pb-2 text-[11px] font-medium transition ${
                  active ? "text-evergreen" : "text-ink-muted"
                }`}
              >
                <PMIcon
                  name={l.icon}
                  width={22}
                  height={22}
                  stroke={active ? undefined : INACTIVE}
                />
                {l.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <Toaster richColors position="top-center" />
    </div>
  );
}
