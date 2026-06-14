import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Odometer } from "@/components/pm/Odometer";
import { GoldDing } from "@/components/pm/GoldDing";
import { PMButton } from "@/components/pm/Button";
import { PMCard } from "@/components/pm/Card";
import { IconChip, PMIcon } from "@/components/pm/Icon";
import { WinsMarquee } from "@/components/pm/Marquee";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PlayMoney — We do the hard work. You just play with the money." },
      {
        name: "description",
        content:
          "PlayMoney quietly recovers refunds, fees, and forgotten charges you're owed. Non-custodial. No win, no fee.",
      },
      {
        property: "og:title",
        content: "PlayMoney — Money you were owed. Already on its way back.",
      },
      {
        property: "og:description",
        content:
          "We find refunds, reversible fees, and wasted subscriptions. You don't lift a finger.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="bg-sand text-ink">
      <Nav />
      <Hero />
      <Ticker />
      <AggregateProof />
      <HowItWorks />
      <DingSection />
      <NoWinNoFee />
      <Testimonial />
      <FinalCta />
      <Footer />
    </div>
  );
}

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 24);
    f();
    window.addEventListener("scroll", f, { passive: true });
    return () => window.removeEventListener("scroll", f);
  }, []);
  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ${
        scrolled ? "backdrop-blur-md" : ""
      }`}
      style={{
        background: scrolled ? "rgba(14,59,45,0.85)" : "transparent",
        borderBottom: scrolled ? "1px solid #1E5A45" : "1px solid transparent",
      }}
    >
      <div className="container-pm flex h-16 items-center justify-between">
        <Link to="/" className="font-display text-xl font-semibold text-text-dark">
          PlayMoney
        </Link>
        <nav className="hidden items-center gap-7 sm:flex">
          <a href="#how" className="text-sm text-text-dark/85 hover:text-text-dark">
            How it works
          </a>
          <a href="#wins" className="text-sm text-text-dark/85 hover:text-text-dark">
            Wins
          </a>
          <Link
            to="/app"
            className="inline-flex h-10 items-center rounded-full bg-gold px-5 text-sm font-semibold text-ink hover:brightness-95"
          >
            Open app
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section
      className="relative flex min-h-screen items-center justify-center overflow-hidden"
      style={{ background: "#15110B" }}
    >
      {/* warm radial glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 45%, rgba(242,194,75,0.10) 0%, rgba(242,194,75,0.00) 55%)",
        }}
      />
      <div className="container-pm relative z-10 flex flex-col items-center text-center">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="eyebrow text-muted-dark"
        >
          Good news, handled
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="mt-6"
        >
          <GoldDing loop>
            <span style={{ color: "#F2C24B" }}>
              <Odometer valueCents={284732} className="odometer-hero font-display" />
            </span>
          </GoldDing>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="font-display mt-10 max-w-3xl text-2xl font-semibold leading-tight text-text-dark sm:text-3xl"
        >
          Money you were owed. Already on its way back.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.55 }}
          className="mt-4 max-w-xl text-muted-dark"
        >
          PlayMoney finds the refunds, fees and forgotten charges you're owed — you don't lift a
          finger.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mt-9 flex flex-col items-center gap-3"
        >
          <Link to="/app/onboarding">
            <PMButton variant="primaryDark">
              Start finding money — free <PMIcon name="arrow" stroke="#1C1813" />
            </PMButton>
          </Link>
          <p className="text-xs text-muted-dark">No win, no fee.</p>
        </motion.div>
      </div>
    </section>
  );
}

function Ticker() {
  return (
    <section
      id="wins"
      style={{
        background: "#0E3B2D",
        borderTop: "1px solid #1E5A45",
        borderBottom: "1px solid #1E5A45",
      }}
      className="py-6"
    >
      <WinsMarquee />
    </section>
  );
}

function AggregateProof() {
  const stats = [
    { v: "$4.2M+", l: "recovered for members" },
    { v: "18,400", l: "members paid out" },
    { v: "$94", l: "average win, in 2 days" },
  ];
  const assurances = [
    "Non-custodial — funds never touch us",
    "We never see your passwords",
    "Bank-level encryption · SOC 2",
  ];
  return (
    <section className="bg-sand" aria-label="PlayMoney results and safety">
      <div className="container-pm py-12 sm:py-16">
        <div className="grid gap-8 sm:grid-cols-3">
          {stats.map((s) => (
            <div key={s.l} className="text-center sm:text-left">
              <p className="font-display tabular text-4xl font-semibold text-ink sm:text-5xl">
                {s.v}
              </p>
              <p className="mt-1 text-sm text-ink-muted">{s.l}</p>
            </div>
          ))}
        </div>
        <ul className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-border-l pt-6 text-sm text-ink-muted">
          {assurances.map((a) => (
            <li key={a} className="inline-flex items-center gap-2">
              <PMIcon
                name="shield"
                stroke="currentColor"
                width={16}
                height={16}
                className="text-evergreen"
              />
              {a}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how" className="section-pad bg-sand">
      <div className="container-pm grid gap-12 lg:grid-cols-[2fr_3fr]">
        <div className="lg:sticky lg:top-28 self-start">
          <p className="eyebrow text-ink-muted">How it works</p>
          <h2 className="h2-display mt-4">
            Three ways your money <br /> comes home.
          </h2>
          <p className="mt-5 max-w-md text-ink-muted">
            We watch the boring stuff — billing emails, statements, expiring promos — for the
            moments money is yours to take back. You get the ding, you tap once, it lands.
          </p>
        </div>

        <div className="grid gap-5">
          <PMCard className="overflow-hidden">
            <div className="flex items-start gap-5">
              <IconChip name="coin" />
              <div className="flex-1">
                <h3 className="text-[1.1875rem] font-semibold leading-tight">Refunds you forgot</h3>
                <p className="mt-2 text-ink-muted">
                  Delays, double charges, promo prices not honored. We chase the paperwork; the
                  dollars come back to you.
                </p>
                <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-mint-chip px-3 py-1.5 text-sm">
                  <PMIcon name="check" stroke="#0E3B2D" width={16} height={16} />
                  <span className="font-display tabular font-semibold text-evergreen">
                    $240 recovered
                  </span>
                  <span className="text-ink-muted">· Delta delay</span>
                </div>
              </div>
            </div>
          </PMCard>

          <div className="grid gap-5 sm:grid-cols-2">
            <PMCard>
              <IconChip name="receipt" />
              <h3 className="mt-5 text-[1.1875rem] font-semibold leading-tight">
                Subscriptions gone cold
              </h3>
              <p className="mt-2 text-ink-muted">
                Auto-renewals you don't open anymore — clawed back where the merchant's terms allow.
              </p>
            </PMCard>
            <PMCard>
              <IconChip name="shield" />
              <h3 className="mt-5 text-[1.1875rem] font-semibold leading-tight">
                Fees that aren't yours
              </h3>
              <p className="mt-2 text-ink-muted">
                Overdrafts, mistaken FX, wrong ATM fees — reversed quietly, without the phone calls.
              </p>
            </PMCard>
          </div>
        </div>
      </div>
    </section>
  );
}

function DingSection() {
  return (
    <section className="section-pad relative overflow-hidden" style={{ background: "#15110B" }}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 50% 50%, rgba(242,194,75,0.10), transparent 60%)",
        }}
      />
      <div className="container-pm relative z-10 text-center">
        <p className="eyebrow text-muted-dark">The ding</p>
        <h2 className="h2-display mt-4 text-text-dark">The sound you'll start waiting for.</h2>
        <p className="mt-4 mx-auto max-w-lg text-muted-dark">
          Every recovery ends with one notification. Tap, and it's done.
        </p>

        <div className="mt-16 flex items-center justify-center">
          <div className="relative">
            <GoldDing loop>
              <div
                className="rounded-[28px] border border-border-d bg-evergreen px-7 py-6 text-left shadow-2xl"
                style={{ minWidth: 320 }}
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] bg-gold">
                    <PMIcon name="bell" stroke="#1C1813" />
                  </span>
                  <span className="text-xs uppercase tracking-widest text-muted-dark">
                    PlayMoney · now
                  </span>
                </div>
                <p
                  className="mt-4 font-display text-3xl font-semibold tabular"
                  style={{ color: "#F2C24B" }}
                >
                  <Odometer valueCents={8000} duration={1400} startFrom={0.4} /> just landed
                </p>
                <p className="mt-1 text-sm text-muted-dark">From Chase · overdraft fee reversed</p>
              </div>
            </GoldDing>
          </div>
        </div>
      </div>
    </section>
  );
}

function NoWinNoFee() {
  const points = [
    { t: "Non-custodial", d: "Money lands in your account. We never hold it." },
    { t: "One tap, no friction", d: "Approve, send, done. No forms, no calls." },
    { t: "We only ping you when there's money", d: "No marketing. No noise. Just landings." },
  ];
  return (
    <section className="section-pad bg-sand">
      <div className="container-pm grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
        <div>
          <p className="eyebrow text-ink-muted">No win, no fee</p>
          <h2 className="h2-display mt-4">
            We don't promise.
            <br />
            We deliver.
          </h2>
          <ul className="mt-8 space-y-5">
            {points.map((p) => (
              <li key={p.t} className="flex items-start gap-4">
                <span className="mt-0.5 inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-mint-chip">
                  <PMIcon name="check" width={16} height={16} stroke="#0E3B2D" />
                </span>
                <div>
                  <p className="font-semibold text-ink">{p.t}</p>
                  <p className="text-ink-muted">{p.d}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div
          className="rounded-[24px] border border-border-d p-8 text-text-dark"
          style={{ background: "#0E3B2D" }}
        >
          <p className="eyebrow text-muted-dark">Example · $100 recovered</p>
          <div className="mt-6 space-y-4 text-text-dark">
            <BreakdownRow k="Gross recovered" v="$100.00" />
            <BreakdownRow k="Our cut · 20%" v="$20.00" muted />
            <div className="my-2 h-px bg-border-d" />
            <div className="flex items-end justify-between">
              <span className="eyebrow text-muted-dark">You get</span>
              <span
                className="font-display text-4xl font-semibold tabular"
                style={{ color: "#F2C24B" }}
              >
                $80.00
              </span>
            </div>
          </div>
          <p className="mt-6 text-sm text-muted-dark">
            Funds route directly to your account. We never touch the money.
          </p>
        </div>
      </div>
    </section>
  );
}

function BreakdownRow({ k, v, muted }: { k: string; v: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? "text-muted-dark" : "text-text-dark"}>{k}</span>
      <span
        className={`font-display tabular text-xl ${muted ? "text-muted-dark" : "text-text-dark"}`}
      >
        {v}
      </span>
    </div>
  );
}

function Testimonial() {
  return (
    <section className="section-pad" style={{ background: "#0E3B2D" }}>
      <div className="container-pm">
        <div className="relative mx-auto max-w-4xl">
          <span
            aria-hidden
            className="font-display absolute -left-2 -top-8 select-none text-[10rem] leading-none"
            style={{ color: "#F2C24B", opacity: 0.8 }}
          >
            “
          </span>
          <blockquote className="font-display relative text-text-dark text-3xl font-semibold leading-tight sm:text-4xl">
            I forgot I'd been double-charged for a flight. PlayMoney pinged me on a Tuesday —{" "}
            <span style={{ color: "#F2C24B" }}>$310 was in my account by Thursday</span>. I didn't
            even make a phone call.
          </blockquote>
          <footer className="mt-8 flex items-center gap-3">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gold font-display text-ink">
              M
            </span>
            <div>
              <p className="font-semibold text-text-dark">Maya Chen</p>
              <p className="text-sm text-muted-dark">PM at a healthtech startup · Brooklyn</p>
            </div>
          </footer>
        </div>

        <div className="mt-14 grid gap-4 border-t border-border-d pt-8 sm:grid-cols-3">
          {[
            { q: "$51.40 back from Uber. Took me one tap.", a: "Andre · Chicago" },
            { q: "Spotify auto-renew refunded after 7 months unused.", a: "Sofia · Madrid" },
            { q: "An overdraft I didn't even notice — gone.", a: "Jordan · Austin" },
          ].map((t) => (
            <p key={t.a} className="text-sm text-text-dark/90">
              "{t.q}"<br />
              <span className="text-muted-dark">— {t.a}</span>
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="section-pad relative overflow-hidden" style={{ background: "#15110B" }}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 50% 60%, rgba(242,194,75,0.08), transparent 65%)",
        }}
      />
      <div className="container-pm relative z-10 mx-auto max-w-3xl text-center">
        <h2 className="h2-display text-text-dark">
          We do the hard work.
          <br />
          <span style={{ color: "#F2C24B" }}>You just play with the money.</span>
        </h2>
        <div className="mt-10 flex flex-col items-center gap-3">
          <Link to="/app/onboarding">
            <PMButton variant="primaryDark">
              Start finding money — free <PMIcon name="arrow" stroke="#1C1813" />
            </PMButton>
          </Link>
          <p className="text-xs text-muted-dark">No win, no fee. Two minutes to set up.</p>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t" style={{ background: "#15110B", borderColor: "#1E5A45" }}>
      <div className="container-pm py-14">
        <div className="grid gap-10 sm:grid-cols-[2fr_1fr_1fr_1fr]">
          <div>
            <p className="font-display text-2xl font-semibold text-text-dark">PlayMoney</p>
            <p className="mt-3 max-w-xs text-sm text-muted-dark">
              We do the hard work. You just play with the money.
            </p>
            <p className="mt-6 text-xs text-muted-dark">
              <PMIcon
                name="shield"
                stroke="#A8C0B4"
                width={14}
                height={14}
                className="inline -mt-0.5"
              />{" "}
              We never hold your money.
            </p>
          </div>
          {[
            { h: "Product", l: ["How it works", "Pricing", "Security"] },
            { h: "Company", l: ["About", "Wins", "Press"] },
            { h: "Legal", l: ["Privacy", "Terms", "Disclosures"] },
          ].map((c) => (
            <div key={c.h}>
              <p className="eyebrow text-muted-dark">{c.h}</p>
              <ul className="mt-4 space-y-2">
                {c.l.map((x) => (
                  <li key={x}>
                    <a className="text-sm text-text-dark/85 hover:text-text-dark" href="#">
                      {x}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div
          className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t pt-6"
          style={{ borderColor: "#1E5A45" }}
        >
          <p className="text-xs text-muted-dark">© 2026 PlayMoney, Inc.</p>
          <p className="text-xs text-muted-dark">Non-custodial · No win, no fee</p>
        </div>
      </div>
    </footer>
  );
}
