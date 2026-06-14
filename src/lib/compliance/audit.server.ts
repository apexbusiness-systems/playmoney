// Append-only audit writer (server-only, service role). Every compliance-
// significant action (gate attestations, decisions) should leave an audit row.

import { getAdminClient } from "@/lib/supabase/admin.server";

export async function appendAudit(entry: {
  actor?: string | null;
  ownerId?: string | null;
  action: string;
  detail?: Record<string, unknown>;
}): Promise<void> {
  const sb = getAdminClient();
  const { error } = await sb.from("audit_log").insert({
    actor: entry.actor ?? null,
    owner_id: entry.ownerId ?? null,
    action: entry.action,
    detail: entry.detail ?? {},
  });
  if (error) throw new Error(`audit append failed: ${error.message}`);
}
