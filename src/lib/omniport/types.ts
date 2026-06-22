// OmniPort connector — Zod schemas + inferred types (APEX-OmniHub integration sidecar).
//
// Every inbound boundary is validated against these schemas before any handler logic
// runs (TS strict, zero `any`). This module is pure: no I/O, no env reads, no imports
// from src/lib/compliance/* — OmniPort never touches money types, payout refs, or the
// go-live seal.

import { z } from "zod";

/** The closed set of commands OmniHub may dispatch. Anything else fails Zod parse. */
export const OmniCommandType = z.enum([
  "SET_FEATURE_FLAG",
  "BROADCAST_NOTICE",
  "REFRESH_CONFIG",
  "HEALTH_PING",
]);
export type OmniCommandType = z.infer<typeof OmniCommandType>;

/** The signed envelope OmniHub POSTs to /api/omniport/{sync,command}. */
export const OmniPacket = z.object({
  command: OmniCommandType,
  payload: z.unknown(),
  sentAt: z.string().min(1),
  nonce: z.string().min(1),
});
export type OmniPacket = z.infer<typeof OmniPacket>;

/** The proof-of-execution returned to OmniHub. `receipt` is always DB-derived. */
export const OmniReceipt = z.object({
  success: z.boolean(),
  receipt: z.string().min(1),
  executedAt: z.string().min(1),
  command: OmniCommandType,
});
export type OmniReceipt = z.infer<typeof OmniReceipt>;

/** Read-only observability view of the platform returned by health/sync/HEALTH_PING. */
export const OmniSnapshot = z.object({
  mode: z.string(),
  omniportEnabled: z.boolean(),
  featureFlagCount: z.number().int().nonnegative(),
  workerUptimeMs: z.number().int().nonnegative(),
  checkedAt: z.string().min(1),
});
export type OmniSnapshot = z.infer<typeof OmniSnapshot>;

/** Mirrors a public.omniport_feature_flags row. */
export const FeatureFlagRow = z.object({
  key: z.string(),
  value: z.string(),
  updated_at: z.string(),
});
export type FeatureFlagRow = z.infer<typeof FeatureFlagRow>;

/** Mirrors a public.omniport_command_log row. */
export const CommandLogRow = z.object({
  id: z.string(),
  command: z.string(),
  payload: z.unknown(),
  receipt: z.string(),
  executed_at: z.string(),
});
export type CommandLogRow = z.infer<typeof CommandLogRow>;

/** Payload schema for SET_FEATURE_FLAG (validated inside the command handler). */
export const SetFeatureFlagPayload = z.object({
  key: z.string().min(1).max(200),
  value: z.string().max(10_000),
});
export type SetFeatureFlagPayload = z.infer<typeof SetFeatureFlagPayload>;

/** Payload schema for BROADCAST_NOTICE (validated inside the command handler). */
export const BroadcastNoticePayload = z.object({
  message: z.string().min(1).max(10_000),
  level: z.enum(["info", "warning", "critical"]).default("info"),
});
export type BroadcastNoticePayload = z.infer<typeof BroadcastNoticePayload>;
