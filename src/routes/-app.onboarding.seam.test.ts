import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Regression shield for the P6 onboarding seam.
 *
 * Commit 5aabbf1 ("bake occupation & context discovery into onboarding") built
 * `OccupationStep`, `rankByContext`, migration `0008_user_context`, and `saveContext`
 * across the mock + supabase clients — but never rendered the step in the onboarding
 * route, and no test guarded the seam, so it merged green while the feature was dead.
 *
 * The test env is `node` (no jsdom/RTL), so this asserts the wiring at the source level:
 * the route must import the component, render it, and persist context through the
 * `auth.saveContext` contract seam. It fails the moment the route un-wires the step.
 */
const routeSrc = readFileSync(
  fileURLToPath(new URL("./app.onboarding.tsx", import.meta.url)),
  "utf8",
);

describe("P6 · onboarding route wires the occupation/context step", () => {
  it("imports OccupationStep from the onboarding component", () => {
    expect(routeSrc).toMatch(
      /import\s+\{\s*OccupationStep\s*\}\s+from\s+["']@\/components\/onboarding\/OccupationStep["']/,
    );
  });

  it("renders <OccupationStep> in the flow", () => {
    expect(routeSrc).toMatch(/<OccupationStep\b/);
  });

  it("persists captured context through the auth.saveContext seam", () => {
    expect(routeSrc).toContain("auth.saveContext");
  });
});
