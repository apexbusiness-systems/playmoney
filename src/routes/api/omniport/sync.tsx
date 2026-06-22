import { createFileRoute } from "@tanstack/react-router";

// POST /api/omniport/sync — authenticated state pull for APEX-OmniHub.
// The server fn (dynamically imported, like health.tsx) reads the active Request and
// returns { status, body }; the loader renders it into a Response.
export const Route = createFileRoute("/api/omniport/sync")({
  loader: async () => {
    const { omniSyncFn } = await import("@/lib/api/omniport.functions");
    const { status, payload } = await omniSyncFn({ data: {} });
    return new Response(payload, {
      status,
      headers: { "Content-Type": "application/json", "X-RateLimit-Limit": "60" },
    });
  },
});
