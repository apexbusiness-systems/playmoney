import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";

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
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-16">
        <a
          href="/"
          className="font-display mb-12 text-2xl font-semibold text-text-dark hover:text-gold transition-colors"
        >
          PlayMoney
        </a>
        <Outlet />
      </div>
      <Toaster richColors position="top-center" />
    </div>
  );
}
