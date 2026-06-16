import { describe, it, expect, vi } from "vitest";
import { Route } from "./health";

// Mock the server function directly since we're just testing the route handler wrapper
vi.mock("@/lib/api/health.functions", () => ({
  goLiveHealthCheckFn: async () => ({
    mode: "BUILT",
    canGoLive: false,
    allGatesGreen: false,
    unmetGates: ["G-counsel"],
    gates: [],
    checkedAt: "2026-06-14T18:00:00.000Z",
  }),
}));

describe("P7 · API Route: /api/health", () => {
  it("returns a 200 Response with JSON content type", async () => {
    // Invoke the loader directly
    const loader = Route.options.loader as unknown as (req: unknown) => Promise<Response>;
    const res = await loader({} as unknown);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });

  it("returns a well-formed HealthReport JSON payload", async () => {
    const loader = Route.options.loader as unknown as (req: unknown) => Promise<Response>;
    const res = await loader({} as unknown);
    const json = await res.json();

    // The endpoint should yield the default 'BUILT' mode offline
    expect(json.mode).toBe("BUILT");
    expect(typeof json.canGoLive).toBe("boolean");
    expect(Array.isArray(json.gates)).toBe(true);
    expect(typeof json.checkedAt).toBe("string");
  });
});
