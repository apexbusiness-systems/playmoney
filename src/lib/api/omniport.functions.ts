// OmniPort connector server functions (APEX-OmniHub integration sidecar).
//
// The work runs inside createServerFn handlers (same pattern as health.functions.ts) so
// the server-only logic — and its dynamic imports of node:process, the request accessor,
// and the service-role client — is stripped from the client bundle. The route loaders
// call these fns and render the { status, body } into a Response.
//
// SIDECAR CONTRACT:
//  - Imports nothing from src/lib/compliance/* and never calls assertLiveAllowed().
//  - Touches zero money types, zero payout refs, zero fund-holding surface.
//  - The OMNIPORT_ENABLED guard is the FIRST line of every handler — before any auth
//    check, body parse, or DB call. When disabled, PlayMoney behaves identically to its
//    pre-OmniPort state (every endpoint returns 503 "OmniPort Offline").
//  - Mutations run via the service-role client; the two OmniPort tables are RLS
//    default-deny, so anon/authenticated callers can never reach them.
//  - The raw body and signature are never logged.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { verifyOmniSignature } from "@/lib/omniport/auth";
import { executeCommand, OmniCommandError, type OmniDb } from "@/lib/omniport/commands";
import { buildSnapshot } from "@/lib/omniport/snapshot";
import { OmniPacket, type OmniSnapshot } from "@/lib/omniport/types";

/**
 * What a handler returns to its route loader. `payload` is pre-serialized JSON (a string
 * is always serializable across the createServerFn boundary); the loader emits it directly
 * as the Response body with the given status.
 */
export interface OmniResult {
  status: number;
  payload: string;
}

// Captured once per worker isolate at module load — reported as workerUptimeMs.
const PROCESS_START_MS = Date.now();

function result(status: number, body: unknown): OmniResult {
  return { status, payload: JSON.stringify(body) };
}

function offline(): OmniResult {
  return result(503, { error: "OmniPort Offline" });
}

/** Service-role DB adapter for the command handlers. */
function makeDb(sb: SupabaseClient, mode: string): OmniDb {
  return {
    async upsertFeatureFlag(key, value) {
      // Let the DB own updated_at (DEFAULT now() on insert, set_updated_at trigger on
      // update) and read it back — the receipt is the DB-confirmed timestamp.
      const { data, error } = await sb
        .from("omniport_feature_flags")
        .upsert({ key, value }, { onConflict: "key" })
        .select("updated_at")
        .single();
      if (error || !data) {
        throw new Error(`feature flag upsert failed: ${error?.message ?? "no row returned"}`);
      }
      return { updatedAt: String((data as { updated_at: string }).updated_at) };
    },
    async insertCommandLog(command, payload) {
      // Insert first so the DB generates the id, then stamp the receipt column with that
      // DB-authoritative id. The returned receipt is never known before the write.
      const ins = await sb
        .from("omniport_command_log")
        .insert({ command, payload: payload ?? null })
        .select("id, executed_at")
        .single();
      if (ins.error || !ins.data) {
        throw new Error(`command log insert failed: ${ins.error?.message ?? "no row returned"}`);
      }
      const row = ins.data as { id: string; executed_at: string };
      const id = String(row.id);
      const upd = await sb.from("omniport_command_log").update({ receipt: id }).eq("id", id);
      if (upd.error) {
        throw new Error(`command log receipt stamp failed: ${upd.error.message}`);
      }
      return { id, executedAt: String(row.executed_at) };
    },
    snapshot: () => buildLiveSnapshot(sb, mode),
  };
}

/** Build the live snapshot from the service-role DB (real flag count) + resolved mode. */
async function buildLiveSnapshot(sb: SupabaseClient, mode: string): Promise<OmniSnapshot> {
  const { count, error } = await sb
    .from("omniport_feature_flags")
    .select("*", { count: "exact", head: true });
  if (error) throw new Error(`feature flag count failed: ${error.message}`);
  return buildSnapshot({
    mode,
    omniportEnabled: true, // the enabled guard has already passed
    featureFlagCount: count ?? 0,
    processStartMs: PROCESS_START_MS,
    now: Date.now(),
  });
}

/** GET /api/omniport/health — liveness/observability. Enabled-guard only (no auth). */
export const omniHealthFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({}))
  .handler(async (): Promise<OmniResult> => {
    const { default: proc } = await import("node:process");
    if (proc.env.OMNIPORT_ENABLED !== "true") return offline();
    const mode = proc.env.PLAYMONEY_MODE === "LIVE" ? "LIVE" : "BUILT";
    try {
      const { getAdminClient } = await import("@/lib/supabase/admin.server");
      const snapshot = await buildLiveSnapshot(getAdminClient(), mode);
      return result(200, snapshot);
    } catch {
      return result(500, { error: "snapshot_failed" });
    }
  });

/** POST /api/omniport/sync — authenticated state pull. Verifies signature, returns snapshot. */
export const omniSyncFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({}))
  .handler(async (): Promise<OmniResult> => {
    const { default: proc } = await import("node:process");
    if (proc.env.OMNIPORT_ENABLED !== "true") return offline();

    const { getRequest } = await import("@tanstack/react-start/server");
    const request = getRequest();

    let body: string;
    try {
      body = await request.text();
    } catch {
      return result(400, { error: "bad_request" });
    }

    const sig = request.headers.get("X-OmniPort-Signature");
    const auth = await verifyOmniSignature(sig, body, proc.env.OMNIPORT_SECRET ?? "");
    if (!auth.valid) return result(401, { error: "Unauthorized", reason: auth.reason });

    const mode = proc.env.PLAYMONEY_MODE === "LIVE" ? "LIVE" : "BUILT";
    try {
      const { getAdminClient } = await import("@/lib/supabase/admin.server");
      const snapshot = await buildLiveSnapshot(getAdminClient(), mode);
      return result(200, snapshot);
    } catch {
      return result(500, { error: "snapshot_failed" });
    }
  });

/** POST /api/omniport/command — authenticated hot-edit command dispatch. */
export const omniCommandFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({}))
  .handler(async (): Promise<OmniResult> => {
    const { default: proc } = await import("node:process");
    if (proc.env.OMNIPORT_ENABLED !== "true") return offline();

    const { getRequest } = await import("@tanstack/react-start/server");
    const request = getRequest();

    let body: string;
    try {
      body = await request.text();
    } catch {
      return result(400, { error: "bad_request" });
    }

    const sig = request.headers.get("X-OmniPort-Signature");
    const auth = await verifyOmniSignature(sig, body, proc.env.OMNIPORT_SECRET ?? "");
    if (!auth.valid) return result(401, { error: "Unauthorized", reason: auth.reason });

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(body);
    } catch {
      return result(400, { error: "invalid_json" });
    }

    const packet = OmniPacket.safeParse(parsedJson);
    if (!packet.success) {
      return result(400, { error: "invalid_packet", issues: packet.error.flatten() });
    }

    const mode = proc.env.PLAYMONEY_MODE === "LIVE" ? "LIVE" : "BUILT";
    try {
      const { getAdminClient } = await import("@/lib/supabase/admin.server");
      const receipt = await executeCommand(packet.data, makeDb(getAdminClient(), mode));
      return result(200, receipt);
    } catch (err) {
      if (err instanceof OmniCommandError) {
        return result(400, { error: err.code, message: err.message });
      }
      // Controlled 500 — never re-throw into the SSR error handler.
      return result(500, { error: "command_failed" });
    }
  });
