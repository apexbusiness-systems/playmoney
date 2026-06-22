import { describe, it, expect } from "vitest";
import { verifyOmniSignature, computeOmniSignature } from "./auth";
import { buildSnapshot } from "./snapshot";
import { executeCommand, OmniCommandError, type OmniDb } from "./commands";
import { OmniPacket } from "./types";

const SECRET = "test-omniport-secret-0123456789abcdef";

interface DbCalls {
  flags: Array<{ key: string; value: string }>;
  logs: Array<{ command: string; payload: unknown }>;
  snapshots: number;
}

function fakeDb(overrides: Partial<OmniDb> = {}): { db: OmniDb; calls: DbCalls } {
  const calls: DbCalls = { flags: [], logs: [], snapshots: 0 };
  const base: OmniDb = {
    async upsertFeatureFlag(key, value) {
      calls.flags.push({ key, value });
      return { updatedAt: "2026-06-22T00:00:00.000Z" };
    },
    async insertCommandLog(command, payload) {
      calls.logs.push({ command, payload });
      return { id: "row-123", executedAt: "2026-06-22T00:00:01.000Z" };
    },
    async snapshot() {
      calls.snapshots++;
      return buildSnapshot({
        mode: "BUILT",
        omniportEnabled: true,
        featureFlagCount: 2,
        processStartMs: 0,
        now: 1000,
      });
    },
  };
  return { db: { ...base, ...overrides }, calls };
}

describe("verifyOmniSignature", () => {
  it("accepts a correct HMAC-SHA256 signature", async () => {
    const body = '{"command":"HEALTH_PING"}';
    const sig = `sha256=${await computeOmniSignature(SECRET, body)}`;
    expect(await verifyOmniSignature(sig, body, SECRET)).toEqual({ valid: true });
  });

  it("rejects a tampered body", async () => {
    const sig = `sha256=${await computeOmniSignature(SECRET, "original")}`;
    const result = await verifyOmniSignature(sig, "tampered", SECRET);
    expect(result).toEqual({ valid: false, reason: "signature_mismatch" });
  });

  it("rejects the wrong secret", async () => {
    const body = "payload";
    const sig = `sha256=${await computeOmniSignature("a-different-secret", body)}`;
    expect((await verifyOmniSignature(sig, body, SECRET)).valid).toBe(false);
  });

  it("rejects a missing header", async () => {
    expect(await verifyOmniSignature(null, "x", SECRET)).toEqual({
      valid: false,
      reason: "missing_signature",
    });
  });

  it("rejects a malformed header (no prefix / bad hex)", async () => {
    expect((await verifyOmniSignature("deadbeef", "x", SECRET)).valid).toBe(false);
    expect((await verifyOmniSignature("sha256=zz", "x", SECRET)).valid).toBe(false);
    expect((await verifyOmniSignature(`sha256=${"a".repeat(63)}`, "x", SECRET)).valid).toBe(false);
  });

  it("rejects when the secret is not configured", async () => {
    expect(await verifyOmniSignature(`sha256=${"a".repeat(64)}`, "x", "")).toEqual({
      valid: false,
      reason: "secret_not_configured",
    });
  });
});

describe("buildSnapshot", () => {
  it("is pure and computes uptime from injected timing", () => {
    const s = buildSnapshot({
      mode: "BUILT",
      omniportEnabled: true,
      featureFlagCount: 3,
      processStartMs: 500,
      now: 2500,
    });
    expect(s).toEqual({
      mode: "BUILT",
      omniportEnabled: true,
      featureFlagCount: 3,
      workerUptimeMs: 2000,
      checkedAt: new Date(2500).toISOString(),
    });
  });

  it("never returns a negative uptime", () => {
    const s = buildSnapshot({
      mode: "LIVE",
      omniportEnabled: false,
      featureFlagCount: 0,
      processStartMs: 9000,
      now: 1000,
    });
    expect(s.workerUptimeMs).toBe(0);
  });
});

describe("executeCommand", () => {
  it("SET_FEATURE_FLAG upserts and returns the DB updated_at as receipt", async () => {
    const { db, calls } = fakeDb();
    const packet = OmniPacket.parse({
      command: "SET_FEATURE_FLAG",
      payload: { key: "beta", value: "on" },
      sentAt: "2026-06-22T00:00:00Z",
      nonce: "n1",
    });
    const r = await executeCommand(packet, db);
    expect(calls.flags).toEqual([{ key: "beta", value: "on" }]);
    expect(r).toEqual({
      success: true,
      receipt: "2026-06-22T00:00:00.000Z",
      executedAt: "2026-06-22T00:00:00.000Z",
      command: "SET_FEATURE_FLAG",
    });
  });

  it("SET_FEATURE_FLAG rejects an invalid payload with OmniCommandError", async () => {
    const { db } = fakeDb();
    const packet = OmniPacket.parse({
      command: "SET_FEATURE_FLAG",
      payload: { key: "" },
      sentAt: "t",
      nonce: "n",
    });
    await expect(executeCommand(packet, db)).rejects.toBeInstanceOf(OmniCommandError);
  });

  it("BROADCAST_NOTICE inserts a log row and returns its DB id as receipt", async () => {
    const { db, calls } = fakeDb();
    const packet = OmniPacket.parse({
      command: "BROADCAST_NOTICE",
      payload: { message: "scheduled maintenance" },
      sentAt: "t",
      nonce: "n",
    });
    const r = await executeCommand(packet, db);
    expect(r.receipt).toBe("row-123");
    expect(r.command).toBe("BROADCAST_NOTICE");
    expect(calls.logs[0]?.command).toBe("BROADCAST_NOTICE");
  });

  it("REFRESH_CONFIG logs and returns the DB row id", async () => {
    const { db, calls } = fakeDb();
    const packet = OmniPacket.parse({
      command: "REFRESH_CONFIG",
      payload: null,
      sentAt: "t",
      nonce: "n",
    });
    const r = await executeCommand(packet, db);
    expect(r.receipt).toBe("row-123");
    expect(calls.logs[0]?.command).toBe("REFRESH_CONFIG");
  });

  it("HEALTH_PING performs no write and returns the snapshot checkedAt", async () => {
    const { db, calls } = fakeDb();
    const packet = OmniPacket.parse({
      command: "HEALTH_PING",
      payload: {},
      sentAt: "t",
      nonce: "n",
    });
    const r = await executeCommand(packet, db);
    expect(calls.flags).toHaveLength(0);
    expect(calls.logs).toHaveLength(0);
    expect(calls.snapshots).toBe(1);
    expect(r.receipt).toBe(new Date(1000).toISOString());
  });

  it("never yields a receipt when the DB write fails (receipt is post-write only)", async () => {
    const { db } = fakeDb({
      insertCommandLog: async () => {
        throw new Error("db unavailable");
      },
    });
    const packet = OmniPacket.parse({
      command: "BROADCAST_NOTICE",
      payload: { message: "x" },
      sentAt: "t",
      nonce: "n",
    });
    await expect(executeCommand(packet, db)).rejects.toThrow("db unavailable");
  });
});

describe("OmniPacket schema", () => {
  it("rejects an unknown command", () => {
    const parsed = OmniPacket.safeParse({
      command: "DROP_TABLE",
      payload: {},
      sentAt: "t",
      nonce: "n",
    });
    expect(parsed.success).toBe(false);
  });

  it("requires nonce and sentAt", () => {
    expect(OmniPacket.safeParse({ command: "HEALTH_PING", payload: {} }).success).toBe(false);
  });
});
