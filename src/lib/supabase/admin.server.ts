// Service-role Supabase client (server-only). Bypasses RLS — use ONLY for
// trusted server operations (migrations runner, ops attestations, audit writes).
// Never import from client code. Secret comes from env, never from the repo.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminConfig } from "@/lib/env.server";

let cached: SupabaseClient | null = null;

export function getAdminClient(): SupabaseClient {
  if (cached) return cached;
  const { url, serviceRoleKey } = getSupabaseAdminConfig();
  cached = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cached;
}
