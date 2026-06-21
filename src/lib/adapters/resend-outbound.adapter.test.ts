import { describe, it, expect, vi, afterEach } from "vitest";
import { ResendOutboundAdapter } from "./resend-outbound.adapter";

let mockSendResponse: {
  data: { id: string } | null;
  error: { name: string; message: string } | null;
} = { data: { id: "mock-email-id" }, error: null };

vi.mock("resend", () => ({
  Resend: class {
    emails = {
      send: vi.fn().mockImplementation(() => Promise.resolve(mockSendResponse)),
    };
  },
}));

afterEach(() => {
  delete process.env.PLAYMONEY_MODE;
  delete process.env.RESEND_API_KEY;
  mockSendResponse = { data: { id: "mock-email-id" }, error: null };
});

const pkg = {
  avenue: "merchant_refund" as const,
  subject: "Test Subject",
  body: "Test Body",
  generatedAt: "2026-06-21T00:00:00.000Z",
};

describe("ResendOutboundAdapter", () => {
  it("throws LiveModeBlockedError in BUILT before any HTTP call", async () => {
    const adapter = new ResendOutboundAdapter();
    await expect(adapter.sendRecoveryPackage(pkg, { email: "test@example.com" })).rejects.toThrow(
      "BLOCKED",
    );
  });

  it("throws error when email is missing", async () => {
    process.env.PLAYMONEY_MODE = "LIVE";
    const adapter = new ResendOutboundAdapter();
    await expect(adapter.sendRecoveryPackage(pkg, {})).rejects.toThrow("no email in destination");
  });

  it("throws error when RESEND_API_KEY is not configured", async () => {
    process.env.PLAYMONEY_MODE = "LIVE";
    const adapter = new ResendOutboundAdapter();
    await expect(adapter.sendRecoveryPackage(pkg, { email: "test@example.com" })).rejects.toThrow(
      "RESEND_API_KEY not configured",
    );
  });

  it("dispatches via resend.emails.send in LIVE mode with RESEND_API_KEY", async () => {
    process.env.PLAYMONEY_MODE = "LIVE";
    process.env.RESEND_API_KEY = "test-key";
    const adapter = new ResendOutboundAdapter();

    const result = await adapter.sendRecoveryPackage(pkg, { email: "test@example.com" });
    expect(result.dispatchRef).toMatch(/^resend_mock-email-id_/);
  });

  it("throws with error message on API failure (error path)", async () => {
    process.env.PLAYMONEY_MODE = "LIVE";
    process.env.RESEND_API_KEY = "test-key";

    mockSendResponse = {
      data: null,
      error: { name: "validation_error", message: "Invalid email" },
    };

    const adapter = new ResendOutboundAdapter();
    await expect(adapter.sendRecoveryPackage(pkg, { email: "test@example.com" })).rejects.toThrow(
      "[ResendOutboundAdapter] Dispatch failed: validation_error — Invalid email",
    );
  });
});
