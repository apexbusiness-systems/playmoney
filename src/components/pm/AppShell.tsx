import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { PMIcon } from "./Icon";
import { Toaster } from "@/components/ui/sonner";

const navLinks = [
  { to: "/app", label: "Wins" },
  { to: "/app/activity", label: "Activity" },
  { to: "/app/settings", label: "Settings" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="min-h-screen bg-sand text-ink">
      <header className="border-b border-border-l bg-card/80 backdrop-blur sticky top-0 z-30">
        <div className="container-pm flex h-16 items-center justify-between">
          <Link to="/" className="font-display text-xl font-semibold">
            PlayMoney
          </Link>
          <nav className="flex items-center gap-1">
            {navLinks.map((l) => {
              const active = pathname === l.to;
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    active ? "bg-evergreen text-text-dark" : "text-ink hover:bg-sand"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border-l bg-card"
              aria-label="Notifications"
            >
              <PMIcon name="bell" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-gold" />
            </button>
            <span
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-evergreen text-text-dark font-display"
              aria-label="Account: Maya Chen"
            >
              M
            </span>
          </div>
        </div>
      </header>
      <main>{children}</main>
      <Toaster richColors position="top-center" />
    </div>
  );
}
