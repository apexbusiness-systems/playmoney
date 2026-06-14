// Anon Supabase client factory. Uses the publishable/anon key — all access is
// RLS-protected (Control #15). Safe for browser + per-request server use.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function createAnonClient(url: string, anonKey: string): SupabaseClient {
  if (!url || !anonKey) throw new Error("Supabase anon client requires url + anonKey");
  return createClient(url, anonKey);
}
