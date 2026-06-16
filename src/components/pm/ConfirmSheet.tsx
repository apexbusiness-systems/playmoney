// ConfirmSheet — bottom-sheet that collects the user's 1-click e-LOA.
//
// Anti-netting layout: the gross amount is what the TARGET PLATFORM sends
// directly to the user's account. PlayMoney's success fee is a SEPARATE
// Stripe merchant charge — never netted from funds in transit (#1, #5).
//
// Status alignment:
//   needs_approval → ConfirmSheet opens; user mints e-LOA via "Authorize & Transfer".
//   on_the_way     → e-LOA minted; enters human-review queue; UI reflects processing
//                    while the internal team greenlights the StripePayoutAdapter.

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { PMButton } from "./Button";
import { PMIcon } from "./Icon";
import { useDialogA11y } from "./useDialog";
import { formatMoney } from "@/lib/playmoney/client";
import type { Recovery } from "@/lib/playmoney/types";

interface Props {
  open: boolean;
  recovery: Recovery | null;
  onClose: () => void;
  onApprove: (rec: Recovery) => Promise<void>;
  /** Masked display of the user's bank account (populated from payoutRef in P4/P6). */
  routingDestination?: string;
  /** Masked display of the card PlayMoney charges its fee to (populated in P6). */
  feeBilledTo?: string;
}

export function ConfirmSheet({
  open,
  recovery,
  onClose,
  onApprove,
  routingDestination = "Checking •••• ——",
  feeBilledTo = "Card •••• ——",
}: Props) {
  const [busy, setBusy] = useState(false);
  const dialogRef = useDialogA11y<HTMLDivElement>(open && !!recovery, onClose);

  return (
    <AnimatePresence>
      {open && recovery && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-espresso/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-lg p-4 sm:bottom-12"
          >
            <div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="confirm-sheet-title"
              tabIndex={-1}
              className="rounded-[20px] bg-card border border-border-l shadow-card-l p-7 outline-none"
            >
              <p className="eyebrow text-ink-muted">Awaiting your OK</p>
              <p id="confirm-sheet-title" className="mt-3 font-display text-2xl font-semibold">
                Found you <span className="text-mint">{formatMoney(recovery.grossAmount)}</span>{" "}
                from {recovery.merchant}.
              </p>

              {/* ── Anti-netting ledger ───────────────────────────────────────────
                  Gross amount routes DIRECTLY from the platform to the user's
                  account. The success fee is a separate Stripe charge (#1, #5).  */}
              <div className="mt-5 rounded-[14px] bg-sand p-4 text-sm">
                <Row k="Target platform sends you" v={formatMoney(recovery.grossAmount)} strong />
                <div className="mt-2 border-t border-border-l pt-2">
                  <Row
                    k="PlayMoney success fee (20%)"
                    v={`− ${formatMoney(recovery.ourFee)}`}
                    muted
                  />
                </div>
              </div>

              {/* ── Routing destination + fee billing anchors ─────────────────── */}
              <div className="mt-4 flex flex-col gap-2 px-1">
                <div className="flex items-center justify-between text-xs text-ink-muted">
                  <span>Routing destination</span>
                  <span className="font-medium text-ink">{routingDestination}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-ink-muted">
                  <span>Fee billed to</span>
                  <span className="font-medium text-ink">{feeBilledTo}</span>
                </div>
              </div>

              {/* ── 1-click e-LOA consent copy + button ──────────────────────── */}
              <p className="mt-6 mb-2 text-center text-[11px] leading-tight text-ink-muted">
                By continuing, you authorize PlayMoney to route these funds on your behalf and agree
                to the success fee charged separately to your card.
              </p>
              <div className="flex items-center gap-3">
                <PMButton
                  variant="primaryLight"
                  className="flex-1"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    await onApprove(recovery);
                    setBusy(false);
                  }}
                >
                  <PMIcon name="check" stroke="#FFFDF8" /> Authorize & Transfer
                </PMButton>
                <button
                  className="text-sm font-medium text-ink-muted hover:text-ink"
                  onClick={onClose}
                >
                  Not now
                </button>
              </div>

              <p className="mt-4 text-xs text-ink-muted">
                Funds route directly to your account. PlayMoney never holds your money.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Row({ k, v, muted, strong }: { k: string; v: string; muted?: boolean; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-ink-muted">{k}</span>
      <span
        className={`tabular ${strong ? "font-display text-lg font-semibold text-ink" : muted ? "text-ink-muted" : "text-ink"}`}
      >
        {v}
      </span>
    </div>
  );
}
