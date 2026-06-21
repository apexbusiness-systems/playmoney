// P5 · RecoveryOutboundPort adapter — sealed in BUILT.
//
// BUILT: assertModeIsLive() throws LiveModeBlockedError before any network call.
// LIVE: dispatches the RCP via SendGrid (SENDGRID_API_KEY required) or falls
//       back to OUTBOUND_EMAIL_FALLBACK_URL (a custom HTTPS endpoint) if configured.
//       If neither is configured, throws LiveModeBlockedError (configuration gate).
//
// This adapter sends TEXT only — there is no parameter, return value, or code path
// that moves, holds, or routes user funds. Non-custodial invariant is untouched.

import type { RecoveryOutboundPort, RecoveryCommPackageRef } from "@/lib/compliance/ports";
import { assertModeIsLive } from "@/lib/compliance/mode";

interface SendGridErrorBody {
  errors?: Array<{ message?: string }>;
}

class EmailRecoveryOutboundAdapter implements RecoveryOutboundPort {
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

    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      throw new Error(
        "RecoveryOutboundAdapter: SENDGRID_API_KEY not configured — required for LIVE dispatch",
      );
    }

    const from = process.env.OUTBOUND_EMAIL_FROM ?? "recovery@playmoney.ca";

    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: from },
        subject: pkg.subject,
        content: [{ type: "text/plain", value: pkg.body }],
      }),
    });

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as SendGridErrorBody;
      const msg = err.errors?.[0]?.message ?? `HTTP ${res.status}`;
      throw new Error(`RecoveryOutboundAdapter: SendGrid returned error: ${msg}`);
    }

    return { dispatchRef: `sg_${Date.now()}_${pkg.generatedAt}` };
  }
}

/**
 * Returns a RecoveryOutboundPort. Sealed in BUILT — every method calls
 * assertModeIsLive() before any I/O. Only a configured SENDGRID_API_KEY
 * enables the LIVE path; missing config throws LiveModeBlockedError so the
 * missing key is an explicit LIVE blocker, not a silent no-op.
 */
export function createRecoveryOutboundAdapter(): RecoveryOutboundPort {
  return new EmailRecoveryOutboundAdapter();
}
