import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/pm/AppShell";

export const Route = createFileRoute("/bank")({
  component: BankLayout,
});

function BankLayout() {
  return (
    <AppShell>
      <div className="container-pm py-8">
        <Outlet />
      </div>
    </AppShell>
  );
}
