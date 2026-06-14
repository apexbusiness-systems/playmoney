// M1 · e-LOA / Authorization (Control #6) [GATE]
//
// A per-recovery, scope-limited, revocable Letter of Authorization carrying an
// Electronic Transactions Act (SA 2001 c E-5.5)-valid e-signature. The verified
// token is the thing MAN Mode (#7) requires before any execute action runs.
//
// verifyLoa() is PURE so the executor's gate is fully testable (T3). The DB
// shape mirrors supabase/migrations/0002_loa.sql.

import { z } from "zod";
import { assertAvenueEnabled } from "./avenues";

export const ESignatureMethod = z.enum(["typed_name", "click_accept", "drawn_signature"]);

export const ESignature = z.object({
  signedBy: z.string().min(1),
  signedAt: z.string().min(1),
  method: ESignatureMethod,
  statement: z.string().min(1), // the authorization statement the user signed
  // ETA SA requires consent to transact electronically; literal-true by design.
  consentElectronic: z.literal(true),
});
export type ESignature = z.infer<typeof ESignature>;

export const LoaScope = z.object({
  avenue: z.string().min(1),
  merchant: z.string().min(1),
  maxAmountCents: z.number().int().nonnegative(),
});
export type LoaScope = z.infer<typeof LoaScope>;

export const LoaToken = z.object({
  id: z.string(),
  ownerId: z.string(),
  recoveryId: z.string(),
  scope: LoaScope,
  isAssignment: z.boolean().default(false),
  signature: ESignature,
  status: z.enum(["active", "revoked", "expired"]),
  expiresAt: z.string(),
  revokedAt: z.string().nullable().optional(),
  idempotencyKey: z.string(),
  createdAt: z.string(),
});
export type LoaToken = z.infer<typeof LoaToken>;

/** The exact action being authorized, checked against a token's scope. */
export interface ExecuteAction {
  recoveryId: string;
  avenue: string;
  merchant: string;
  amountCents: number;
}

export type LoaVerification =
  | { valid: true; token: LoaToken }
  | { valid: false; code: LoaFailureCode; reason: string };

export type LoaFailureCode =
  | "no_token"
  | "revoked"
  | "expired"
  | "wrong_recovery"
  | "avenue_disabled"
  | "scope_avenue_mismatch"
  | "scope_merchant_mismatch"
  | "amount_exceeds_scope"
  | "invalid_signature";

function eq(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * PURE authorization check. Returns valid:true ONLY when the token is active,
 * unexpired, unrevoked, e-signed, for the exact recovery, and the action falls
 * fully inside the token's scope (avenue enabled + matched, merchant matched,
 * amount within cap). Never throws.
 */
export function verifyLoa(
  token: LoaToken | null | undefined,
  action: ExecuteAction,
  now: Date = new Date(),
): LoaVerification {
  if (!token) return { valid: false, code: "no_token", reason: "No LOA token for this action" };

  const parsed = LoaToken.safeParse(token);
  if (!parsed.success) {
    return { valid: false, code: "invalid_signature", reason: "LOA token failed validation" };
  }
  const t = parsed.data;

  if (t.status === "revoked" || t.revokedAt) {
    return { valid: false, code: "revoked", reason: "LOA has been revoked" };
  }
  if (t.status === "expired" || new Date(t.expiresAt).getTime() <= now.getTime()) {
    return { valid: false, code: "expired", reason: "LOA has expired" };
  }
  if (!eq(t.recoveryId, action.recoveryId)) {
    return { valid: false, code: "wrong_recovery", reason: "LOA is for a different recovery" };
  }

  // Avenue must still be an enabled administrative avenue (#9 ties to #6).
  try {
    assertAvenueEnabled(t.scope.avenue);
  } catch {
    return { valid: false, code: "avenue_disabled", reason: `Avenue ${t.scope.avenue} is disabled` };
  }

  if (!eq(t.scope.avenue, action.avenue)) {
    return { valid: false, code: "scope_avenue_mismatch", reason: "Action avenue outside LOA scope" };
  }
  if (!eq(t.scope.merchant, action.merchant)) {
    return { valid: false, code: "scope_merchant_mismatch", reason: "Action merchant outside LOA scope" };
  }
  if (action.amountCents > t.scope.maxAmountCents) {
    return { valid: false, code: "amount_exceeds_scope", reason: "Action amount exceeds LOA cap" };
  }

  return { valid: true, token: t };
}

/** Builds an LOA record ready to persist. Validates avenue + e-signature up front. */
export function buildLoa(input: {
  id?: string;
  ownerId: string;
  recoveryId: string;
  scope: LoaScope;
  signature: ESignature;
  ttlMinutes: number;
  idempotencyKey: string;
  isAssignment?: boolean;
  now?: Date;
}): LoaToken {
  assertAvenueEnabled(input.scope.avenue); // refuse to authorize a disabled avenue
  ESignature.parse(input.signature); // refuse an invalid e-signature
  LoaScope.parse(input.scope);
  const now = input.now ?? new Date();
  const token: LoaToken = {
    id: input.id ?? crypto.randomUUID(),
    ownerId: input.ownerId,
    recoveryId: input.recoveryId,
    scope: input.scope,
    isAssignment: input.isAssignment ?? false,
    signature: input.signature,
    status: "active",
    expiresAt: new Date(now.getTime() + input.ttlMinutes * 60_000).toISOString(),
    revokedAt: null,
    idempotencyKey: input.idempotencyKey,
    createdAt: now.toISOString(),
  };
  return LoaToken.parse(token);
}

/** Revokes a token (reversible authority — Control #6). Idempotent. */
export function revokeLoa(token: LoaToken, now: Date = new Date()): LoaToken {
  return { ...token, status: "revoked", revokedAt: token.revokedAt ?? now.toISOString() };
}
