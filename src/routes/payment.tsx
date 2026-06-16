import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/pm/AppShell";

export const Route = createFileRoute("/payment")({
  component: PaymentLayout,
});

function PaymentLayout() {
  return (
    <AppShell>
      <div className="container-pm py-8">
        <Outlet />
      </div>
    </AppShell>
  );
}
