import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { LanguageSwitcher } from "@/components/pm/LanguageSwitcher";

// Auth shell — wraps sign-in, check-email, verify-otp, and callback routes.
// Intentionally minimal: no app nav, no sidebar, just centered auth UI.
export const Route = createFileRoute("/auth")({
  component: AuthShell,
});

function AuthShell() {
  return (
    <div className="min-h-screen bg-espresso text-text-dark" style={{ background: "#15110B" }}>
      {/* Warm ambient glow — matches landing hero */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 40%, rgba(242,194,75,0.08) 0%, rgba(242,194,75,0.00) 55%)",
        }}
      />
      <div className="absolute right-4 top-4 z-20">
        <LanguageSwitcher variant="dark" />
      </div>
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-16">
        <a href="/" className="mb-12 transition-all hover:opacity-90" aria-label="PlayMoney home">
          <img src="/wordmark.png" alt="PlayMoney" className="h-8 w-auto" width={148} height={32} />
        </a>
        <Outlet />
      </div>
      <Toaster richColors position="top-center" />
    </div>
  );
}
