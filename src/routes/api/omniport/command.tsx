import { createFileRoute } from "@tanstack/react-router";

// POST /api/omniport/command — authenticated hot-edit command dispatch for APEX-OmniHub.
// The server fn (dynamically imported, like health.tsx) reads the active Request, runs the
// command, and returns { status, body }; the loader renders it into a Response.
export const Route = createFileRoute("/api/omniport/command")({
  loader: async () => {
    const { omniCommandFn } = await import("@/lib/api/omniport.functions");
    const { status, payload } = await omniCommandFn({ data: {} });
    return new Response(payload, {
      status,
      headers: { "Content-Type": "application/json", "X-RateLimit-Limit": "60" },
    });
  },
});
