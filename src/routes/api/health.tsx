import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/health")({
  loader: async () => {
    // We dynamically import the server function to avoid leaking server code to the client bundle
    // Although API routes are server-side, it is good practice to separate the implementation details.
    const { goLiveHealthCheckFn } = await import("@/lib/api/health.functions");

    // Call the server function (it requires an empty object input per its validator)
    const report = await goLiveHealthCheckFn({ data: {} });

    // We must return a Response object from an API route.
    return new Response(JSON.stringify(report, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  },
});
