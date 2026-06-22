// OmniPort inbound packet authentication.
//
// Every packet from APEX-OmniHub carries:
//   X-OmniPort-Signature: sha256=<hex>
//   where <hex> = HMAC-SHA256(key=OMNIPORT_SECRET, message=rawRequestBodyAsUtf8).
//
// Uses the Web Crypto API (crypto.subtle) — native in the Cloudflare Workers runtime
// AND in the Node test runtime — so no Node `crypto` module and no test-time stub is
// required. This module never throws: it returns a typed result so handlers translate
// every failure into a 401, never a 500 that could bleed into the SSR error handler.

export type OmniAuthResult = { valid: true } | { valid: false; reason: string };

const SIG_PREFIX = "sha256=";
const HEX64 = /^[0-9a-f]{64}$/;

function toHex(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, "0");
  }
  return out;
}

/** Constant-time compare of two equal-length hex strings. */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/** Compute the lowercase hex HMAC-SHA256 of `body` under `secret`. */
export async function computeOmniSignature(secret: string, body: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  return toHex(sig);
}

/**
 * Verify an inbound OmniPort signature against the raw request body.
 * Returns a typed result; the caller maps `{ valid: false }` to HTTP 401.
 */
export async function verifyOmniSignature(
  signatureHeader: string | null,
  body: string,
  secret: string,
): Promise<OmniAuthResult> {
  if (!secret) return { valid: false, reason: "secret_not_configured" };
  if (!signatureHeader) return { valid: false, reason: "missing_signature" };
  if (!signatureHeader.startsWith(SIG_PREFIX)) {
    return { valid: false, reason: "malformed_signature" };
  }
  const received = signatureHeader.slice(SIG_PREFIX.length).toLowerCase();
  if (!HEX64.test(received)) return { valid: false, reason: "malformed_signature" };

  const expected = await computeOmniSignature(secret, body);
  if (!constantTimeEqual(expected, received)) {
    return { valid: false, reason: "signature_mismatch" };
  }
  return { valid: true };
}
