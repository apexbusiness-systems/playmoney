import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { api, auth } from "@/lib/playmoney/client";
import { useFormatMoney } from "@/lib/playmoney/currency";
import type { Recovery } from "@/lib/playmoney/types";
import { approveRecovery } from "@/lib/playmoney/approve";
import { buildMerchantContact } from "@/lib/playmoney/merchant-directory";
import { rankByContextKey } from "@/lib/engine/situation";
import { Odometer } from "@/components/pm/Odometer";
import { GoldDing } from "@/components/pm/GoldDing";
import { StatusPill } from "@/components/pm/StatusPill";
import { PMIcon } from "@/components/pm/Icon";
import { PMButton } from "@/components/pm/Button";
import { ConfirmSheet } from "@/components/pm/ConfirmSheet";
import { useDialogA11y } from "@/components/pm/useDialog";

export const Route = createFileRoute("/app/")({
  head: () => ({ meta: [{ title: "Your wins — PlayMoney" }] }),
  component: WinsPage,
});

function WinsPage() {
  const qc = useQueryClient();
  const totals = useQuery({ queryKey: ["totals"], queryFn: () => api.totals() });
  const recs = useQuery({ queryKey: ["recoveries"], queryFn: () => api.listRecoveries() });

  // P5: Fetch upstream pipeline situations if they have them.
  const situations = useQuery({
    queryKey: ["situations"],
    queryFn: async () => {
      const { getSituationsFn } = await import("@/lib/api/situations.functions");
      return getSituationsFn();
    },
  });

  const profile = useQuery({ queryKey: ["profile"], queryFn: () => auth.getProfile() });
  const [confirming, setConfirming] = useState<Recovery | null>(null);
  const [landed, setLanded] = useState<Recovery | null>(null);
  const fmt = useFormatMoney();

  // P6/P3: if the user told us their occupation, surface the most relevant wins
  // first (engine `rankByContextKey`). Detection is unchanged — only the order.
  const context = profile.data?.context;
  const ordered = useMemo(
    () =>
      context ? rankByContextKey(recs.data ?? [], (r) => r.avenue, context) : (recs.data ?? []),
    [recs.data, context],
  );

  async function approve(rec: Recovery) {
    setConfirming(null);
    try {
      await approveRecovery({
        qc,
        rec,
        run: () =>
          api.approveRecovery({
            recoveryId: rec.id,
            idempotencyKey: rec.idempotencyKey,
            merchantContact: buildMerchantContact(rec.merchant),
          }),
      });
      setLanded(rec);
    } catch {
      // approveRecovery has already rolled the optimistic update back.
      toast.error("That didn't go through", {
        description: `We couldn't send ${fmt(rec.userNet)} from ${rec.merchant}. Nothing left your side — tap to try again.`,
      });
    }
  }

  return (
    <>
      {/* DARK total strip */}
      <section style={{ background: "#0E3B2D", borderBottom: "1px solid #1E5A45" }}>
        <div className="container-pm py-10 sm:py-14">
          <p className="eyebrow text-muted-dark">Found for you</p>
          <div className="mt-3 flex items-end justify-between gap-6">
            <h1
              className="font-display tabular text-5xl font-semibold leading-none sm:text-6xl"
              style={{ color: "#F2C24B" }}
            >
              {totals.data ? (
                <Odometer valueCents={totals.data.foundTotal} duration={1800} />
              ) : (
                <span className="opacity-40">$0.00</span>
              )}
            </h1>
            <div className="hidden text-right sm:block">
              <p className="text-sm text-muted-dark">Landed in your account</p>
              <p className="font-display tabular text-2xl text-text-dark">
                {totals.data ? fmt(totals.data.landedTotal) : "—"}
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
            {context ? "Prioritized for you" : `Watching ${recs.data?.length ?? 0} signals`}
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {recs.isLoading && <SkeletonFeed />}
          {/* P5: Show bank connect or situations if pipeline is totally empty */}
          {recs.data?.length === 0 && !situations.data?.situations.length && <EmptyPipeline />}
          {recs.data?.length === 0 && (situations.data?.situations.length ?? 0) > 0 && (
            <SituationsCard
              count={situations.data!.situations.length}
              amountCents={situations.data!.situations.reduce((sum, s) => sum + s.amountCents, 0)}
            />
          )}

          {ordered.map((r) => (
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
  const fmt = useFormatMoney();
  // Bigger win = bigger, visually featured card.
  const size = rec.userNet >= 15000 ? "lg" : rec.userNet >= 5000 ? "md" : "sm";
  const featured = size === "lg";
  const pad = size === "lg" ? "p-7 sm:p-8" : size === "md" ? "p-6" : "p-5";
  const amountClass =
    size === "lg" ? "text-4xl sm:text-5xl" : size === "md" ? "text-3xl" : "text-2xl";
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={`relative rounded-[20px] border bg-card shadow-card-l ${pad} ${
        featured ? "border-gold/40 ring-1 ring-gold/30" : "border-border-l"
      }`}
      style={{
        borderLeft: `4px solid ${rec.status === "landed" ? "#F2C24B" : rec.status === "needs_approval" ? "#E6A92E" : "#0F6B50"}`,
        background: featured
          ? "linear-gradient(180deg, rgba(242,194,75,0.06) 0%, rgba(255,253,248,1) 40%)"
          : undefined,
      }}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          {featured && <p className="eyebrow mb-2 text-gold">Top win</p>}
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
          <p className={`font-display tabular font-semibold ${amountClass}`}>{fmt(rec.userNet)}</p>
          <StatusPill status={rec.status} />
        </div>
      </div>
      {rec.status === "needs_approval" && (
        <div className="mt-5 flex items-center justify-between gap-4 rounded-[14px] bg-sand px-4 py-3 text-sm">
          <span className="text-ink-muted">
            Tap to send <span className="font-semibold text-ink">{fmt(rec.userNet)}</span> to your
            account.
          </span>
          <PMButton
            variant="primaryLight"
            className="!h-10 shrink-0 whitespace-nowrap !px-4 text-sm"
            onClick={onApprove}
          >
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

function EmptyPipeline() {
  return (
    <div className="rounded-[20px] border border-dashed border-border-l bg-card p-10 text-center">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-mint-chip">
        <PMIcon name="shield" />
      </span>
      <p className="mt-4 font-display text-xl font-semibold">Ready to find your money?</p>
      <p className="mt-1 text-ink-muted">Connect your bank securely to scan for hidden refunds.</p>
      <div className="mt-6 flex justify-center">
        <Link
          to="/bank/connect"
          className="inline-flex h-10 items-center rounded-full bg-gold px-5 text-sm font-semibold text-ink hover:brightness-95"
        >
          Connect a bank
        </Link>
      </div>
    </div>
  );
}

function SituationsCard({ count, amountCents }: { count: number; amountCents: number }) {
  const fmt = useFormatMoney();
  return (
    <div
      className="rounded-[20px] border border-gold/40 bg-card p-6 text-center shadow-card-l"
      style={{
        background: "linear-gradient(180deg, rgba(242,194,75,0.06) 0%, rgba(255,253,248,1) 40%)",
      }}
    >
      <p className="font-display text-2xl font-semibold">We found {count} new situations!</p>
      <p className="mt-2 text-ink-muted">
        Totaling up to <span className="font-semibold text-text-dark">{fmt(amountCents)}</span>.
      </p>
      <div className="mt-6 flex justify-center">
        <Link
          to="/app/pipeline"
          className="inline-flex h-10 items-center rounded-full bg-evergreen px-5 text-sm font-semibold text-text-dark hover:brightness-110 transition"
        >
          Review pipeline
        </Link>
      </div>
    </div>
  );
}

function LandedDialog({ rec, onClose }: { rec: Recovery | null; onClose: () => void }) {
  const fmt = useFormatMoney();
  const dialogRef = useDialogA11y<HTMLDivElement>(!!rec, onClose);
  return (
    <AnimatePresence>
      {rec && (
        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={`Recovered ${fmt(rec.userNet)} from ${rec.merchant}`}
          tabIndex={-1}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center outline-none"
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
            <p className="mt-8 font-display text-2xl text-text-dark">From {rec.merchant}</p>
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
