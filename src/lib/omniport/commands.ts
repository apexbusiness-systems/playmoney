// OmniPort command handlers — pure dispatch, no I/O of their own.
//
// Handlers receive a PRE-VALIDATED OmniPacket plus an injected `OmniDb` adapter. The
// concrete adapter (service-role Supabase) lives in src/lib/api/omniport.functions.ts;
// tests inject a fake. Critically, every command that mutates state derives its receipt
// from the value the DB returns AFTER the write resolves — a receipt is never fabricated
// before the mutation is confirmed.

import {
  SetFeatureFlagPayload,
  BroadcastNoticePayload,
  type OmniCommandType,
  type OmniPacket,
  type OmniReceipt,
  type OmniSnapshot,
} from "./types";

/**
 * The data operations the command handlers depend on. Each write method returns the
 * DB-authoritative artifact (row id / updated_at) that becomes the receipt.
 */
export interface OmniDb {
  /** Upsert a feature flag; returns the DB-set updated_at timestamp. */
  upsertFeatureFlag(key: string, value: string): Promise<{ updatedAt: string }>;
  /** Append a command-log row; returns the DB-generated id + executed_at. */
  insertCommandLog(
    command: OmniCommandType,
    payload: unknown,
  ): Promise<{ id: string; executedAt: string }>;
  /** Build the current read-only platform snapshot (HEALTH_PING). */
  snapshot(): Promise<OmniSnapshot>;
}

/** Thrown when a command payload fails its schema; handlers map this to HTTP 400. */
export class OmniCommandError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "OmniCommandError";
  }
}

/**
 * Execute a pre-validated OmniPacket against the injected DB adapter. Pure dispatch:
 * no env reads, no direct I/O. Throws OmniCommandError on a bad payload so the caller
 * returns a structured 400.
 */
export async function executeCommand(packet: OmniPacket, db: OmniDb): Promise<OmniReceipt> {
  const command = packet.command;
  switch (command) {
    case "SET_FEATURE_FLAG": {
      const parsed = SetFeatureFlagPayload.safeParse(packet.payload);
      if (!parsed.success) {
        throw new OmniCommandError("invalid_payload", "SET_FEATURE_FLAG payload invalid");
      }
      const { updatedAt } = await db.upsertFeatureFlag(parsed.data.key, parsed.data.value);
      return { success: true, receipt: updatedAt, executedAt: updatedAt, command };
    }
    case "BROADCAST_NOTICE": {
      const parsed = BroadcastNoticePayload.safeParse(packet.payload);
      if (!parsed.success) {
        throw new OmniCommandError("invalid_payload", "BROADCAST_NOTICE payload invalid");
      }
      const { id, executedAt } = await db.insertCommandLog(command, parsed.data);
      return { success: true, receipt: id, executedAt, command };
    }
    case "REFRESH_CONFIG": {
      const { id, executedAt } = await db.insertCommandLog(command, packet.payload ?? {});
      return { success: true, receipt: id, executedAt, command };
    }
    case "HEALTH_PING": {
      const snap = await db.snapshot();
      return { success: true, receipt: snap.checkedAt, executedAt: snap.checkedAt, command };
    }
    default: {
      const exhaustive: never = command;
      throw new OmniCommandError("unknown_command", `unhandled command: ${String(exhaustive)}`);
    }
  }
}
