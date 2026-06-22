import { createFileRoute } from "@tanstack/react-router";

// GET /api/omniport/health — liveness/observability for APEX-OmniHub.
// The server fn (dynamically imported, like health.tsx) returns { status, body }; the
// loader renders it into a Response.
export const Route = createFileRoute("/api/omniport/health")({
  loader: async () => {
    const { omniHealthFn } = await import("@/lib/api/omniport.functions");
    const { status, payload } = await omniHealthFn({ data: {} });
    return new Response(payload, {
      status,
      headers: { "Content-Type": "application/json", "X-RateLimit-Limit": "60" },
    });
  },
});
