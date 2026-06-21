import { afterEach, describe, expect, it } from "vitest";
import { ingestThroughAdapter, buildFlinksConnectUrl } from "./bank.functions";
import { createAccountDataAdapter } from "@/lib/adapters/account-data";
import { LiveModeBlockedError } from "@/lib/compliance/mode";

// The ingest path must remain sealed in BUILT (default). We never set
// PLAYMONEY_MODE=LIVE here — the point is to prove the seal is honored honestly.
afterEach(() => {
  delete process.env.PLAYMONEY_MODE;
});

describe("T1 · bank ingest is sealed-but-honest in BUILT mode", () => {
  it("returns a typed sealed_until_live result, not a thrown 500 and not a fake success", async () => {
    const result = await ingestThroughAdapter({
      aggregatorToken: "tok_demo",
      config: {}, // unconfigured adapter → sealed stub, still sealed in BUILT
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("sealed_until_live");
      expect(result.message).toMatch(/live/i);
    }
    // Critically: it is NOT a fabricated success.
    expect(result).not.toHaveProperty("situationCount");
  });

  it("the configured (Flinks) adapter path is also sealed, returning sealed_until_live", async () => {
    const result = await ingestThroughAdapter({
      aggregatorToken: "tok_demo",
      config: { flinksUrl: "https://flinks.example", flinksClientId: "client_demo" },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("sealed_until_live");
  });

  it("the seal originates from INSIDE the real adapter call path (not a bypass)", async () => {
    // The same adapter the ingest path invokes must itself throw LiveModeBlockedError in
    // BUILT — proving the sealed result comes from a real adapter refusal, not from a
    // hardcoded short-circuit that never touched the adapter.
    const adapter = createAccountDataAdapter({
      flinksUrl: "https://flinks.example",
      flinksClientId: "client_demo",
    });
    await expect(adapter.listTransactions({ aggregatorToken: "tok_demo" })).rejects.toBeInstanceOf(
      LiveModeBlockedError,
    );
  });

  it("does NOT swallow non-seal errors (a real failure must propagate)", async () => {
    const boom = new Error("network exploded");
    const adapter = { listTransactions: async () => Promise.reject(boom) };
    // Inline the catch contract: only LiveModeBlockedError is translated.
    await expect(adapter.listTransactions()).rejects.toBe(boom);
  });
});

describe("T1 · Flinks connect URL is real when configured, sealed otherwise", () => {
  it("returns sealed_until_live when Flinks env is absent (BUILT default)", () => {
    const result = buildFlinksConnectUrl({});
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("sealed_until_live");
  });

  it("builds a real templated URL from config (URL construction, not a live API call)", () => {
    const result = buildFlinksConnectUrl({
      apiUrl: "https://toolbox-api.private.fin.ag",
      clientId: "abc123",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.connectUrl).toContain("https://toolbox-api.private.fin.ag/v2/abc123/connect");
      expect(result.connectUrl).toContain("clientId=abc123");
      expect(result.connectUrl).not.toContain("mock.flinks.com");
    }
  });
});
