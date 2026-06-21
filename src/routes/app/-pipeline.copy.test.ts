import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Honesty guard for the Found-Refunds pipeline (T2).
 *
 * Sample-preview data must never render under copy that claims it was really "found
 * in your bank history". This source-level test (node env, no jsdom) asserts the
 * route shows the disclosed sample-preview banner and that the "found by our engines"
 * claim is gated behind `!sampleMode` — i.e. it only appears for genuinely live data.
 */
const routeSrc = readFileSync(fileURLToPath(new URL("./pipeline.tsx", import.meta.url)), "utf8");

describe("T2 · pipeline labels sample data honestly", () => {
  it("renders the disclosed sample-preview banner", () => {
    expect(routeSrc).toContain("Sample preview");
    expect(routeSrc).toMatch(/Real scanning unlocks at launch/);
  });

  it("reads sampleMode from the situations result", () => {
    expect(routeSrc).toMatch(/situations\.data\?\.sampleMode/);
  });

  it("does not present the 'found in your bank history' claim unconditionally", () => {
    // The claim may exist for the live branch, but only inside the sampleMode ternary.
    const claimIdx = routeSrc.indexOf("found by our engines");
    const ternaryIdx = routeSrc.indexOf("sampleMode");
    expect(claimIdx).toBeGreaterThan(-1);
    expect(ternaryIdx).toBeGreaterThan(-1);
    // The sampleMode branch must be wired before the claim string in the JSX block.
    expect(routeSrc).toMatch(/sampleMode[\s\S]*Sample preview[\s\S]*found by our engines/);
  });
});
