// P5 · Recovery Communication Package (RCP) builder — pure, no I/O.
//
// Builds the structured dispute letter PlayMoney sends to a merchant on behalf
// of the user. Each of the 4 enabled administrative avenues has its own template
// with Canadian regulatory citations woven into the body (not appended as a footer).
//
// ALL output is UPL-linted at generation time (assertCleanCopy). Adminstrative tone
// only — never legal advice, never demand/litigation language.

import type { AvenueKey } from "@/lib/compliance/avenues";
import { assertCleanCopy } from "@/lib/compliance/upl";
import type { MerchantContact } from "@/lib/playmoney/types";
import type { RecoveryCommPackageRef } from "@/lib/compliance/ports";

export interface RecoveryCommPackage extends RecoveryCommPackageRef {
  readonly recoveryId: string;
  readonly avenue: AvenueKey;
  readonly merchant: string;
  readonly contact: MerchantContact;
  readonly citations: readonly string[];
}

export interface RcpInput {
  avenue: AvenueKey;
  merchant: string;
  contact: MerchantContact;
  userDisplayName: string;
  amountCents: number;
  recoveryId: string;
  reason: string;
  now?: Date;
}

function dollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)} CAD`;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function lines(...parts: string[]): string {
  return parts.join("\n");
}

// ── Avenue templates ─────────────────────────────────────────────────────────

function merchantRefund(
  input: RcpInput,
  date: string,
): Pick<RecoveryCommPackage, "subject" | "body" | "citations"> {
  const { merchant, userDisplayName, amountCents, recoveryId, reason } = input;
  const amount = dollars(amountCents);
  return {
    subject: `Written Notice — Refund Request — ${merchant} — ${amount} — ${date}`,
    body: lines(
      `Dear ${merchant} Customer Relations Team,`,
      ``,
      `I am writing on behalf of ${userDisplayName}, who has authorized PlayMoney Inc. to pursue this recovery (authorization reference: ${recoveryId}).`,
      ``,
      `This notice concerns a charge of ${amount} processed on or around ${date} by ${merchant}. ${reason}`,
      ``,
      `Under applicable Canadian consumer protection legislation — including the Consumer Protection Act, 2002 (Ontario, S.O. 2002, c. 30, Sched. A) and equivalent provincial statutes — consumers are entitled to request a refund for charges that do not reflect goods or services as represented or delivered. ${userDisplayName} is respectfully requesting a full refund of ${amount} to the original payment method.`,
      ``,
      `Please respond in writing within 14 business days of this notice with confirmation of the refund or a written explanation of ${merchant}'s position. If the matter remains unresolved within that period, ${userDisplayName} may initiate a chargeback dispute through their card issuer under applicable card network dispute resolution procedures.`,
      ``,
      `Thank you for your prompt attention.`,
      ``,
      `Sincerely,`,
      `PlayMoney Recovery`,
      `Authorized representative for ${userDisplayName}`,
      `Authorization reference: ${recoveryId}`,
    ),
    citations: [
      "Consumer Protection Act, 2002 (Ontario, S.O. 2002, c. 30, Sched. A)",
      "Applicable provincial consumer protection statutes",
      "Visa/Mastercard dispute resolution procedures",
    ],
  };
}

function feeReversal(
  input: RcpInput,
  date: string,
): Pick<RecoveryCommPackage, "subject" | "body" | "citations"> {
  const { merchant, userDisplayName, amountCents, recoveryId, reason } = input;
  const amount = dollars(amountCents);
  return {
    subject: `Written Notice — Fee Reversal Request — ${merchant} — ${amount} — ${date}`,
    body: lines(
      `Dear ${merchant} Customer Relations Team,`,
      ``,
      `I am writing on behalf of ${userDisplayName}, who has authorized PlayMoney Inc. to raise this matter on their behalf (authorization reference: ${recoveryId}).`,
      ``,
      `A fee of ${amount} was applied to ${userDisplayName}'s account on or around ${date}. ${reason}`,
      ``,
      `Financial institutions and service providers in Canada are expected to handle fee complaints in good faith in accordance with the Financial Consumer Agency of Canada (FCAC) complaint-handling guidance and the Canadian Bankers Association (CBA) Code of Conduct for the Delivery of Banking Services to Canadians. ${userDisplayName} is respectfully requesting a full reversal of the ${amount} fee.`,
      ``,
      `Please respond within 14 business days with confirmation of the reversal or a written explanation of ${merchant}'s position. If no resolution is received, ${userDisplayName} may escalate this matter to the Financial Consumer Agency of Canada (FCAC) or, where applicable, to the Ombudsman for Banking Services and Investments (OBSI).`,
      ``,
      `Thank you for your attention to this matter.`,
      ``,
      `Sincerely,`,
      `PlayMoney Recovery`,
      `Authorized representative for ${userDisplayName}`,
      `Authorization reference: ${recoveryId}`,
    ),
    citations: [
      "Financial Consumer Agency of Canada (FCAC) — complaint-handling guidance",
      "Canadian Bankers Association (CBA) Code of Conduct for the Delivery of Banking Services",
      "Ombudsman for Banking Services and Investments (OBSI) — escalation avenue",
    ],
  };
}

function billingError(
  input: RcpInput,
  date: string,
): Pick<RecoveryCommPackage, "subject" | "body" | "citations"> {
  const { merchant, userDisplayName, amountCents, recoveryId, reason } = input;
  const amount = dollars(amountCents);
  return {
    subject: `Written Notice — Billing Discrepancy — ${merchant} — ${amount} — ${date}`,
    body: lines(
      `Dear ${merchant} Billing Department,`,
      ``,
      `I am writing on behalf of ${userDisplayName}, who has authorized PlayMoney Inc. to raise this matter on their behalf (authorization reference: ${recoveryId}).`,
      ``,
      `A billing discrepancy of ${amount} has been identified on ${userDisplayName}'s account with ${merchant} on or around ${date}. ${reason}`,
      ``,
      `Billing accuracy is required under applicable Canadian consumer protection legislation. Where ${merchant} is a telecommunications provider, the CRTC Wireless Code and Television Service Provider Code establish consumer billing rights, including the right to dispute charges and receive itemized bills. Where ${merchant} is a regulated utility, provincial energy regulator requirements — including the Ontario Energy Board (OEB), Alberta Utilities Commission (AUC), or BC Utilities Commission (BCUC), as applicable — establish billing complaint and correction procedures. For other billing disputes, the Consumer Protection Act, 2002 (Ontario, S.O. 2002, c. 30, Sched. A) and equivalent provincial statutes apply.`,
      ``,
      `${userDisplayName} is respectfully requesting a billing correction and refund of ${amount} to the original payment method.`,
      ``,
      `Please respond within 14 business days with confirmation of the correction or a written explanation of ${merchant}'s position.`,
      ``,
      `Thank you for your prompt attention.`,
      ``,
      `Sincerely,`,
      `PlayMoney Recovery`,
      `Authorized representative for ${userDisplayName}`,
      `Authorization reference: ${recoveryId}`,
    ),
    citations: [
      "Consumer Protection Act, 2002 (Ontario, S.O. 2002, c. 30, Sched. A)",
      "CRTC Wireless Code / Television Service Provider Code (telecommunications)",
      "Ontario Energy Board (OEB), Alberta Utilities Commission (AUC), BC Utilities Commission (BCUC) (utilities)",
      "Applicable provincial consumer protection statutes",
    ],
  };
}

function subscriptionCancellation(
  input: RcpInput,
  date: string,
): Pick<RecoveryCommPackage, "subject" | "body" | "citations"> {
  const { merchant, userDisplayName, amountCents, recoveryId, reason } = input;
  const amount = dollars(amountCents);
  return {
    subject: `Written Notice — Subscription Cancellation Refund Request — ${merchant} — ${amount} — ${date}`,
    body: lines(
      `Dear ${merchant} Customer Support Team,`,
      ``,
      `I am writing on behalf of ${userDisplayName}, who has authorized PlayMoney Inc. to pursue this recovery (authorization reference: ${recoveryId}).`,
      ``,
      `${userDisplayName} cancelled their subscription with ${merchant} prior to the charge of ${amount} processed on or around ${date}. ${reason} A charge was applied after the cancellation was confirmed, and ${userDisplayName} is respectfully requesting a full refund of ${amount} to the original payment method.`,
      ``,
      `Under the Consumer Protection Act, 2002 (Ontario, S.O. 2002, c. 30, Sched. A, s. 25) and equivalent provincial consumer protection statutes governing internet agreements and recurring charges, consumers have the right to cancel ongoing subscription agreements and to receive refunds for charges applied after a confirmed cancellation. Auto-renewal charges made without adequate advance notice, or applied after a confirmed cancellation request, are subject to these consumer protections.`,
      ``,
      `Please respond within 14 business days with confirmation of the refund to the original payment method. If no response is received within that period, ${userDisplayName} may initiate a chargeback dispute through their card issuer under applicable card network rules governing unauthorized or post-cancellation recurring charges.`,
      ``,
      `Thank you for your attention to this matter.`,
      ``,
      `Sincerely,`,
      `PlayMoney Recovery`,
      `Authorized representative for ${userDisplayName}`,
      `Authorization reference: ${recoveryId}`,
    ),
    citations: [
      "Consumer Protection Act, 2002 (Ontario, S.O. 2002, c. 30, Sched. A, s. 25) — internet agreements and recurring charges",
      "Applicable provincial consumer protection statutes — subscription cancellation rights",
      "Card network rules — unauthorized/post-cancellation recurring charge disputes",
    ],
  };
}

// ── Public builder ────────────────────────────────────────────────────────────

export class UnsupportedAvenueError extends Error {
  constructor(avenue: string) {
    super(
      `buildRecoveryCommPackage: avenue "${avenue}" is not a supported enabled avenue`,
    );
    this.name = "UnsupportedAvenueError";
  }
}

/**
 * Build a UPL-linted Recovery Communication Package for the given avenue.
 * Pure — no I/O. Safe to call in BUILT (build-time validation).
 * The dispatch (send) is sealed by RecoveryOutboundAdapter.
 */
export function buildRecoveryCommPackage(input: RcpInput): RecoveryCommPackage {
  const now = input.now ?? new Date();
  const date = isoDate(now);

  let parts: Pick<RecoveryCommPackage, "subject" | "body" | "citations">;
  switch (input.avenue) {
    case "merchant_refund":
      parts = merchantRefund(input, date);
      break;
    case "fee_reversal":
      parts = feeReversal(input, date);
      break;
    case "billing_error_correction":
      parts = billingError(input, date);
      break;
    case "subscription_cancellation":
      parts = subscriptionCancellation(input, date);
      break;
    default:
      throw new UnsupportedAvenueError(input.avenue);
  }

  // UPL guard — lints body at generation time. Never skip.
  const lintedBody = assertCleanCopy(parts.body);

  return {
    recoveryId: input.recoveryId,
    avenue: input.avenue,
    merchant: input.merchant,
    contact: input.contact,
    subject: parts.subject,
    body: lintedBody,
    citations: parts.citations,
    generatedAt: now.toISOString(),
  };
}
