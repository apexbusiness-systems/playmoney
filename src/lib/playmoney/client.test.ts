import { describe, expect, it } from "vitest";
import { assertSupabaseConfigWhenRequired, hasSupabaseConfig, selectClients } from "./client";
import { MockApiClient, MockAuthClient } from "./mock";
import { SupabaseApiClient, SupabaseAuthClient } from "./supabase";

describe("P1 · client selector: real Supabase when configured, mock fallback otherwise", () => {
  it("falls back to the mock when config is absent or partial", () => {
    expect(hasSupabaseConfig({})).toBe(false);
    expect(hasSupabaseConfig({ supabaseUrl: "https://x.supabase.co" })).toBe(false);
    expect(hasSupabaseConfig({ supabaseAnonKey: "anon" })).toBe(false);

    const sel = selectClients({});
    expect(sel.source).toBe("mock");
    expect(sel.api).toBeInstanceOf(MockApiClient);
    expect(sel.auth).toBeInstanceOf(MockAuthClient);
  });

  it("selects the real Supabase clients when both public values are present", () => {
    const cfg = { supabaseUrl: "https://proj.supabase.co", supabaseAnonKey: "anon-key" };
    expect(hasSupabaseConfig(cfg)).toBe(true);

    const sel = selectClients(cfg);
    expect(sel.source).toBe("supabase");
    expect(sel.api).toBeInstanceOf(SupabaseApiClient);
    expect(sel.auth).toBeInstanceOf(SupabaseAuthClient);
  });

  it("the mock client still serves seeded data offline (fallback intact)", async () => {
    const { api } = selectClients({});
    const recs = await api.listRecoveries();
    expect(recs.length).toBeGreaterThan(0);
    const totals = await api.totals();
    expect(totals.foundTotal).toBeGreaterThan(0);
  });

  it("fails production builds instead of silently selecting the mock client", () => {
    expect(() => assertSupabaseConfigWhenRequired({}, true)).toThrow(/MockApiClient/);
    expect(() =>
      assertSupabaseConfigWhenRequired({ supabaseUrl: "https://proj.supabase.co" }, true),
    ).toThrow(/VITE_SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_KEY/);
    expect(() =>
      assertSupabaseConfigWhenRequired(
        { supabaseUrl: "https://proj.supabase.co", supabaseAnonKey: "anon-key" },
        true,
      ),
    ).not.toThrow();
  });
});
