import { afterEach, describe, expect, it } from "vitest";
import { getMode, isLiveEnabled, assertLiveAllowed, LiveModeBlockedError } from "./mode";
import { GATE_KEYS, canGoLive, EMPTY_GATE_STATUS, type GateStatus } from "./gates";

const ALL_GREEN: GateStatus = Object.fromEntries(GATE_KEYS.map((k) => [k, true])) as GateStatus;

afterEach(() => {
  delete process.env.PLAYMONEY_MODE;
});

describe("T10 · default mode BUILT and canGoLive false until all gates green", () => {
  it("defaults to BUILT when PLAYMONEY_MODE is unset", () => {
    expect(getMode()).toBe("BUILT");
  });

  it("canGoLive() is false for empty/partial gate status", () => {
    expect(canGoLive(EMPTY_GATE_STATUS)).toBe(false);
    expect(canGoLive(undefined)).toBe(false);
    expect(canGoLive({ ...ALL_GREEN, "G-counsel": false })).toBe(false);
  });

  it("canGoLive() is true only when EVERY gate is green", () => {
    expect(canGoLive(ALL_GREEN)).toBe(true);
  });

  it("isLiveEnabled requires BOTH mode=LIVE and all gates green", () => {
    expect(isLiveEnabled(ALL_GREEN)).toBe(false); // mode still BUILT
    process.env.PLAYMONEY_MODE = "LIVE";
    expect(isLiveEnabled(EMPTY_GATE_STATUS)).toBe(false); // gates red
    expect(isLiveEnabled(ALL_GREEN)).toBe(true);
  });

  it("assertLiveAllowed throws in BUILT mode and with unmet gates", () => {
    expect(() => assertLiveAllowed(ALL_GREEN)).toThrow(LiveModeBlockedError);
    process.env.PLAYMONEY_MODE = "LIVE";
    expect(() => assertLiveAllowed(EMPTY_GATE_STATUS)).toThrow(/unmet go-live gates/);
    expect(() => assertLiveAllowed(ALL_GREEN)).not.toThrow();
  });

  it("any non-LIVE PLAYMONEY_MODE value resolves to BUILT", () => {
    process.env.PLAYMONEY_MODE = "live"; // wrong case
    expect(getMode()).toBe("BUILT");
    process.env.PLAYMONEY_MODE = "PROD";
    expect(getMode()).toBe("BUILT");
  });
});
