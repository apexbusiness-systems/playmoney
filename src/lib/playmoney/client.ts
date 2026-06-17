// P1 · The single client seam the app imports from.
//
// Selects the REAL Supabase-backed clients when public config is present
// (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY), and falls back to the in-memory
// mock otherwise — so the UI works offline / in non-production CI with zero config,
// and renders real RLS-scoped data the moment Supabase is wired. Production deploy
// builds must set VITE_PLAYMONEY_REQUIRE_SUPABASE_CONFIG=true so mock fallback cannot
// silently ship. `selectClients` is pure over its config so the choice is
// unit-testable without touching the environment.

import { createAnonClient } from "@/lib/supabase/client";
import type { ApiClient, AuthClient } from "./types";
import { MockApiClient, MockAuthClient } from "./mock";
import { SupabaseApiClient, SupabaseAuthClient } from "./supabase";

// Re-export the pure money formatter so routes get clients + formatting from one seam.
export { formatMoney } from "./mock";

export interface PublicSupabaseConfig {
  readonly supabaseUrl?: string;
  readonly supabaseAnonKey?: string;
}

export type ClientSource = "supabase" | "mock";

export interface SelectedClients {
  readonly api: ApiClient;
  readonly auth: AuthClient;
  readonly source: ClientSource;
}

/** True only when both public Supabase values are present and non-empty. */
export function hasSupabaseConfig(
  cfg: PublicSupabaseConfig,
): cfg is Required<PublicSupabaseConfig> {
  return Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey);
}

export function assertSupabaseConfigWhenRequired(
  cfg: PublicSupabaseConfig,
  requireSupabaseConfig: boolean,
): void {
  if (requireSupabaseConfig && !hasSupabaseConfig(cfg)) {
    throw new Error(
      "Production build requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY; refusing to use MockApiClient.",
    );
  }
}

/** PURE: pick real vs mock clients from config. Real path uses the anon (RLS) key. */
export function selectClients(cfg: PublicSupabaseConfig): SelectedClients {
  if (hasSupabaseConfig(cfg)) {
    const sb = createAnonClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
    return { api: new SupabaseApiClient(sb), auth: new SupabaseAuthClient(sb), source: "supabase" };
  }
  return { api: new MockApiClient(), auth: new MockAuthClient(), source: "mock" };
}

/**
 * Reads PUBLIC (RLS-safe) Supabase config. Prefers Vite's import.meta.env (browser
 * + server bundles); falls back to process.env for Node/test contexts. Never reads
 * the service-role secret — that is server-only (admin.server.ts).
 */
export function readPublicSupabaseConfig(): PublicSupabaseConfig {
  const viteEnv =
    typeof import.meta !== "undefined"
      ? (import.meta as { env?: Record<string, string | undefined> }).env
      : undefined;
  const procEnv = typeof process !== "undefined" ? process.env : undefined;
  const pick = (key: string): string | undefined => viteEnv?.[key] ?? procEnv?.[key];
  return {
    supabaseUrl: pick("VITE_SUPABASE_URL"),
    supabaseAnonKey: pick("VITE_SUPABASE_ANON_KEY"),
  };
}

function requiresSupabaseConfig(): boolean {
  const viteEnv =
    typeof import.meta !== "undefined"
      ? (import.meta as { env?: Record<string, string | undefined> }).env
      : undefined;
  const procEnv = typeof process !== "undefined" ? process.env : undefined;
  return (
    viteEnv?.VITE_PLAYMONEY_REQUIRE_SUPABASE_CONFIG === "true" ||
    procEnv?.PLAYMONEY_REQUIRE_SUPABASE_CONFIG === "true"
  );
}

const publicSupabaseConfig = readPublicSupabaseConfig();
assertSupabaseConfigWhenRequired(publicSupabaseConfig, requiresSupabaseConfig());
const selected = selectClients(publicSupabaseConfig);

/** The active data client (real when configured, else mock). */
export const api: ApiClient = selected.api;
/** The active auth client (real when configured, else mock). */
export const auth: AuthClient = selected.auth;
/** Which backend the app is currently running against — for diagnostics. */
export const clientSource: ClientSource = selected.source;
