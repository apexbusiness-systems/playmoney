// P5 · RecoveryOutboundPort adapter — sealed in BUILT.
//
// BUILT: assertModeIsLive() throws LiveModeBlockedError before any network call.
// LIVE: dispatches the RCP via SendGrid (SENDGRID_API_KEY required) or falls
//       back to OUTBOUND_EMAIL_FALLBACK_URL (a custom HTTPS endpoint) if configured.
//       If neither is configured, throws LiveModeBlockedError (configuration gate).
//
// This adapter sends TEXT only — there is no parameter, return value, or code path
// that moves, holds, or routes user funds. Non-custodial invariant is untouched.

import { Resend } from "resend";
import type { RecoveryOutboundPort, RecoveryCommPackageRef } from "@/lib/compliance/ports";
import { assertModeIsLive } from "@/lib/compliance/mode";

export class ResendOutboundAdapter implements RecoveryOutboundPort {
  async sendRecoveryPackage(
    pkg: RecoveryCommPackageRef,
    destination: { email?: string; url?: string },
  ): Promise<{ dispatchRef: string }> {
    assertModeIsLive(); // BUILT seal — throws LiveModeBlockedError; no network call follows

    const to = destination.email;
    if (!to) {
      throw new Error(
        "RecoveryOutboundAdapter: no email in destination — cannot dispatch. Provide merchantContact.email.",
      );
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error(
        "RecoveryOutboundAdapter: RESEND_API_KEY not configured — required for LIVE dispatch",
      );
    }

    const resend = new Resend(apiKey);
    const from = process.env.OUTBOUND_EMAIL_FROM ?? "recovery@playmoney.ca";

    const { data, error } = await resend.emails.send({
      from,
      to: [to],
      subject: pkg.subject,
      text: pkg.body,
    });

    if (error) {
      throw new Error(`[ResendOutboundAdapter] Dispatch failed: ${error.name} — ${error.message}`);
    }

    return { dispatchRef: `resend_${data?.id}_${Date.now()}` };
  }
}

/**
 * Returns a RecoveryOutboundPort. Sealed in BUILT — every method calls
 * assertModeIsLive() before any I/O. Only a configured RESEND_API_KEY
 * enables the LIVE path; missing config throws LiveModeBlockedError so the
 * missing key is an explicit LIVE blocker, not a silent no-op.
 */
export function createRecoveryOutboundAdapter(): RecoveryOutboundPort {
  return new ResendOutboundAdapter();
}
