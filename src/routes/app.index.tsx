import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { api, formatMoney } from "@/lib/playmoney/client";
import type { Recovery } from "@/lib/playmoney/types";
import { Odometer } from "@/components/pm/Odometer";
import { GoldDing } from "@/components/pm/GoldDing";
import { StatusPill } from "@/components/pm/StatusPill";
import { PMIcon } from "@/components/pm/Icon";
import { PMButton } from "@/components/pm/Button";
import { ConfirmSheet } from "@/components/pm/ConfirmSheet";

export const Route = createFileRoute("/app/")({
  head: () => ({ meta: [{ title: "Your wins — PlayMoney" }] }),
  component: WinsPage,
});

function WinsPage() {
  const qc = useQueryClient();
  const totals = useQuery({ queryKey: ["totals"], queryFn: () => api.totals() });
  const recs = useQuery({ queryKey: ["recoveries"], queryFn: () => api.listRecoveries() });
  const [confirming, setConfirming] = useState<Recovery | null>(null);
  const [landed, setLanded] = useState<Recovery | null>(null);

  async function approve(rec: Recovery) {
    // optimistic
    qc.setQueryData<Recovery[]>(["recoveries"], (old) =>
      old?.map((r) => (r.id === rec.id ? { ...r, status: "on_the_way" } : r)),
    );
    setConfirming(null);
    await api.approveRecovery({ recoveryId: rec.id, idempotencyKey: rec.idempotencyKey });
    setLanded(rec);
    await qc.invalidateQueries({ queryKey: ["recoveries"] });
    await qc.invalidateQueries({ queryKey: ["totals"] });
  }

  return (
    <>
      {/* DARK total strip */}
      <section style={{ background: "#0E3B2D", borderBottom: "1px solid #1E5A45" }}>
        <div className="container-pm py-10 sm:py-14">
          <p className="eyebrow text-muted-dark">Found for you</p>
          <div className="mt-3 flex items-end justify-between gap-6">
            <h1 className="font-display tabular text-5xl font-semibold leading-none sm:text-6xl" style={{ color: "#F2C24B" }}>
              {totals.data ? (
                <Odometer valueCents={totals.data.foundTotal} duration={1800} />
              ) : (
                <span className="opacity-40">$0.00</span>
              )}
            </h1>
            <div className="hidden text-right sm:block">
              <p className="text-sm text-muted-dark">Landed in your account</p>
              <p className="font-display tabular text-2xl text-text-dark">
                {totals.data ? formatMoney(totals.data.landedTotal) : "—"}
              </p>
            </div>
          </div>
          <p className="mt-3 max-w-lg text-sm text-muted-dark">
            We only ping you when there's money. Tap any card to approve.
          </p>
        </div>
      </section>

      <section className="container-pm py-10">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold">Recent wins</h2>
          <div className="flex items-center gap-2 text-sm text-ink-muted">
            <span className="h-2 w-2 rounded-full bg-mint" />
            Watching {recs.data?.length ?? 0} signals
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {recs.isLoading && <SkeletonFeed />}
          {recs.data?.length === 0 && <EmptyState />}
          {recs.data?.map((r) => (
            <RecoveryCard key={r.id} rec={r} onApprove={() => setConfirming(r)} />
          ))}
        </div>
      </section>

      <ConfirmSheet
        open={!!confirming}
        recovery={confirming}
        onClose={() => setConfirming(null)}
        onApprove={approve}
      />

      <LandedDialog rec={landed} onClose={() => setLanded(null)} />
    </>
  );
}

function RecoveryCard({ rec, onApprove }: { rec: Recovery; onApprove: () => void }) {
  // Bigger win = bigger card
  const size =
    rec.userNet >= 15000 ? "lg" : rec.userNet >= 5000 ? "md" : "sm";
  const pad = size === "lg" ? "p-7" : size === "md" ? "p-6" : "p-5";
  const amountClass =
    size === "lg"
      ? "text-4xl"
      : size === "md"
        ? "text-3xl"
        : "text-2xl";
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={`relative rounded-[20px] border border-border-l bg-card shadow-card-l ${pad}`}
      style={{
        borderLeft: `4px solid ${rec.status === "landed" ? "#F2C24B" : rec.status === "needs_approval" ? "#E6A92E" : "#0F6B50"}`,
      }}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-mint-chip">
              <PMIcon name={iconFor(rec.avenue)} />
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold">{rec.merchant}</p>
              <p className="truncate text-sm text-ink-muted">{rec.reason}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-5 sm:flex-col sm:items-end">
          <p className={`font-display tabular font-semibold ${amountClass}`}>
            {formatMoney(rec.userNet)}
          </p>
          <StatusPill status={rec.status} />
        </div>
      </div>
      {rec.status === "needs_approval" && (
        <div className="mt-5 flex items-center justify-between gap-4 rounded-[14px] bg-sand px-4 py-3 text-sm">
          <span className="text-ink-muted">Tap to send <span className="font-semibold text-ink">{formatMoney(rec.userNet)}</span> to your account.</span>
          <PMButton variant="primaryLight" className="!h-10 !px-4 text-sm" onClick={onApprove}>
            Send it
          </PMButton>
        </div>
      )}
    </motion.div>
  );
}

function iconFor(a: Recovery["avenue"]) {
  switch (a) {
    case "refund":
    case "billing_error":
      return "receipt" as const;
    case "fee_reversal":
      return "shield" as const;
    case "subscription":
      return "envelope" as const;
    case "double_charge":
      return "coin" as const;
  }
}

function SkeletonFeed() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-24 animate-pulse rounded-[20px] border border-border-l bg-card/60"
        />
      ))}
    </>
  );
}

function EmptyState() {
  return (
    <div className="rounded-[20px] border border-dashed border-border-l bg-card p-10 text-center">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-mint-chip">
        <PMIcon name="bell" />
      </span>
      <p className="mt-4 font-display text-xl font-semibold">All quiet — we're watching.</p>
      <p className="mt-1 text-ink-muted">We'll ping you the moment there's money.</p>
    </div>
  );
}

function LandedDialog({ rec, onClose }: { rec: Recovery | null; onClose: () => void }) {
  return (
    <AnimatePresence>
      {rec && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "#15110B" }}
        >
          <div className="text-center">
            <p className="eyebrow text-muted-dark">Just landed</p>
            <div className="mt-6">
              <GoldDing trigger={1}>
                <span className="odometer-hero font-display" style={{ color: "#F2C24B" }}>
                  <Odometer valueCents={rec.userNet} duration={1600} startFrom={0.3} />
                </span>
              </GoldDing>
            </div>
            <p className="mt-8 font-display text-2xl text-text-dark">
              From {rec.merchant}
            </p>
            <button
              onClick={onClose}
              className="mt-10 inline-flex h-11 items-center rounded-full bg-gold px-6 font-semibold text-ink"
            >
              Back to wins
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}