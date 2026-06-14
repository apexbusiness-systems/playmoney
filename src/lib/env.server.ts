// Server-only environment access (.server.ts => never bundled to the client).
// Secrets live ONLY in the environment / secret store, never in code or the repo
// (Architecture invariant #6). Read inside functions: on edge runtimes env binds
// per-request, so module-scope reads can be undefined.

import process from "node:process";

function require_(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

/** Public client config — safe to expose (RLS-protected). */
export function getSupabasePublicConfig() {
  return {
    url: require_("SUPABASE_URL"),
    anonKey: process.env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY ?? "",
  };
}

/** Service-role config — SECRET, bypasses RLS. Server-only; never to the client. */
export function getSupabaseAdminConfig() {
  return {
    url: require_("SUPABASE_URL"),
    serviceRoleKey: require_("SUPABASE_SERVICE_ROLE_KEY"),
  };
}

/** Supabase project ref parsed from the URL (e.g. https://<ref>.supabase.co). */
export function getSupabaseProjectRef(): string {
  const { url } = getSupabaseAdminConfig();
  const m = /https?:\/\/([a-z0-9]+)\.supabase\./i.exec(url);
  if (!m) throw new Error(`Cannot parse Supabase project ref from SUPABASE_URL`);
  return m[1];
}
