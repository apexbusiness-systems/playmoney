import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Odometer } from "@/components/pm/Odometer";
import { GoldDing } from "@/components/pm/GoldDing";
import { PMButton } from "@/components/pm/Button";
import { PMCard } from "@/components/pm/Card";
import { IconChip, PMIcon } from "@/components/pm/Icon";
import { WinsMarquee } from "@/components/pm/Marquee";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { LanguageSwitcher } from "@/components/pm/LanguageSwitcher";

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
  const { t } = useI18n();

  return (
    <header
      className="fixed inset-x-0 top-0 z-40 border-b"
      style={{ background: "#0E3B2D", borderColor: "#1E5A45" }}
    >
      <div className="container-pm flex h-16 items-center justify-between">
        <Link to="/" className="inline-flex items-center" aria-label="PlayMoney home">
          <img src="/wordmark.png" alt="PlayMoney" className="h-8 w-auto" width={148} height={32} />
        </Link>
        <div className="flex items-center gap-4">
          <LanguageSwitcher variant="dark" />
          <nav className="hidden items-center gap-7 sm:flex">
            <a href="#how" className="text-sm text-text-dark/85 hover:text-text-dark">
              {t("landing.nav.howItWorks")}
            </a>
            <a href="#wins" className="text-sm text-text-dark/85 hover:text-text-dark">
              {t("landing.nav.wins")}
            </a>
            <Link
              to="/auth/sign-in"
              className="inline-flex h-10 items-center rounded-full bg-gold px-5 text-sm font-semibold text-ink hover:brightness-95"
            >
              {t("landing.nav.getStarted")}
            </Link>
          </nav>
          <Link
            to="/auth/sign-in"
            className="inline-flex h-8 items-center rounded-full bg-gold px-3 text-xs font-semibold text-ink hover:brightness-95 sm:hidden"
          >
            {t("landing.nav.getStarted")}
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  const { t } = useI18n();

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
          {t("landing.hero.eyebrow")}
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
          {t("landing.hero.title")}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.55 }}
          className="mt-4 max-w-xl text-muted-dark"
        >
          {t("landing.hero.description")}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mt-9 flex flex-col items-center gap-3"
        >
          <Link to="/app/onboarding">
            <PMButton variant="primaryDark">
              {t("landing.hero.cta")} <PMIcon name="arrow" stroke="#1C1813" />
            </PMButton>
          </Link>
          <p className="text-xs text-muted-dark">{t("landing.hero.ctaSub")}</p>
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
  const { t } = useI18n();

  const stats = [
    { v: "$4.2M+", l: t("landing.proof.recovered") },
    { v: "18,400", l: t("landing.proof.members") },
    { v: t("landing.proof.average"), l: "" },
  ];
  const assurances = [
    t("landing.proof.nonCustodial"),
    t("landing.proof.noPasswords"),
    t("landing.proof.encryption"),
  ];
  return (
    <section className="bg-sand" aria-label="PlayMoney results and safety">
      <div className="container-pm py-12 sm:py-16">
        <div className="grid gap-8 sm:grid-cols-3">
          {stats.map((s, idx) => (
            <div key={idx} className="text-center sm:text-left">
              <p className="font-display tabular text-4xl font-semibold text-ink sm:text-5xl">
                {s.v}
              </p>
              {s.l && <p className="mt-1 text-sm text-ink-muted">{s.l}</p>}
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
  const { t, locale } = useI18n();

  const recovered1 = locale === "fr" ? "240 $ récupérés" : "$240 recovered";

  return (
    <section id="how" className="section-pad bg-sand">
      <div className="container-pm grid gap-12 lg:grid-cols-[2fr_3fr]">
        <div className="lg:sticky lg:top-28 self-start">
          <p className="eyebrow text-ink-muted">{t("landing.how.eyebrow")}</p>
          <h2 className="h2-display mt-4">{t("landing.how.title")}</h2>
          <p className="mt-5 max-w-md text-ink-muted">{t("landing.how.description")}</p>
        </div>

        <div className="grid gap-5">
          <PMCard className="overflow-hidden">
            <div className="flex items-start gap-5">
              <IconChip name="coin" />
              <div className="flex-1">
                <h3 className="text-[1.1875rem] font-semibold leading-tight">
                  {t("landing.how.card1.title")}
                </h3>
                <p className="mt-2 text-ink-muted">{t("landing.how.card1.description")}</p>
                <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-mint-chip px-3 py-1.5 text-sm">
                  <PMIcon name="check" stroke="#0E3B2D" width={16} height={16} />
                  <span className="font-display tabular font-semibold text-evergreen">
                    {recovered1}
                  </span>
                  <span className="text-ink-muted">{t("landing.how.card1.badgeSub")}</span>
                </div>
              </div>
            </div>
          </PMCard>

          <div className="grid gap-5 sm:grid-cols-2">
            <PMCard>
              <IconChip name="receipt" />
              <h3 className="mt-5 text-[1.1875rem] font-semibold leading-tight">
                {t("landing.how.card2.title")}
              </h3>
              <p className="mt-2 text-ink-muted">{t("landing.how.card2.description")}</p>
            </PMCard>
            <PMCard>
              <IconChip name="shield" />
              <h3 className="mt-5 text-[1.1875rem] font-semibold leading-tight">
                {t("landing.how.card3.title")}
              </h3>
              <p className="mt-2 text-ink-muted">{t("landing.how.card3.description")}</p>
            </PMCard>
          </div>
        </div>
      </div>
    </section>
  );
}

function DingSection() {
  const { t } = useI18n();

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
        <p className="eyebrow text-muted-dark">{t("landing.ding.eyebrow")}</p>
        <h2 className="h2-display mt-4 text-text-dark">{t("landing.ding.title")}</h2>
        <p className="mt-4 mx-auto max-w-lg text-muted-dark">{t("landing.ding.description")}</p>

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
                    {t("landing.ding.now")}
                  </span>
                </div>
                <p
                  className="mt-4 font-display text-3xl font-semibold tabular"
                  style={{ color: "#F2C24B" }}
                >
                  <Odometer valueCents={8000} duration={1400} startFrom={0.4} />{" "}
                  {t("landing.ding.justLanded", { amount: "" }).trim()}
                </p>
                <p className="mt-1 text-sm text-muted-dark">{t("landing.ding.chase")}</p>
              </div>
            </GoldDing>
          </div>
        </div>
      </div>
    </section>
  );
}

function NoWinNoFee() {
  const { t, locale } = useI18n();

  const points = [
    { t: t("landing.nowin.point1.title"), d: t("landing.nowin.point1.desc") },
    { t: t("landing.nowin.point2.title"), d: t("landing.nowin.point2.desc") },
    { t: t("landing.nowin.point3.title"), d: t("landing.nowin.point3.desc") },
  ];

  const exGross = locale === "fr" ? "100,00 $" : "$100.00";
  const exFee = locale === "fr" ? "20,00 $" : "$20.00";
  const exNet = locale === "fr" ? "80,00 $" : "$80.00";

  return (
    <section className="section-pad bg-sand">
      <div className="container-pm grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
        <div>
          <p className="eyebrow text-ink-muted">{t("landing.nowin.eyebrow")}</p>
          <h2 className="h2-display mt-4">{t("landing.nowin.title")}</h2>
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
          <p className="eyebrow text-muted-dark">{t("landing.nowin.example.title")}</p>
          <div className="mt-6 space-y-4 text-text-dark">
            <BreakdownRow k={t("landing.nowin.example.gross")} v={exGross} />
            <BreakdownRow k={t("landing.nowin.example.fee")} v={exFee} muted />
            <div className="my-2 h-px bg-border-d" />
            <div className="flex items-end justify-between">
              <span className="eyebrow text-muted-dark">{t("landing.nowin.example.youGet")}</span>
              <span
                className="font-display text-4xl font-semibold tabular"
                style={{ color: "#F2C24B" }}
              >
                {exNet}
              </span>
            </div>
          </div>
          <p className="mt-6 text-sm text-muted-dark">{t("landing.nowin.example.footnote")}</p>
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
  const { t } = useI18n();

  const highlightText = (
    <span style={{ color: "#F2C24B" }}>{t("landing.testimonial.highlight")}</span>
  );
  const quoteTemplate = t("landing.testimonial.quote");
  const parts = quoteTemplate.split("{highlight}");

  const testimonials = [
    { q: t("landing.testimonial.mini1.quote"), a: t("landing.testimonial.mini1.author") },
    { q: t("landing.testimonial.mini2.quote"), a: t("landing.testimonial.mini2.author") },
    { q: t("landing.testimonial.mini3.quote"), a: t("landing.testimonial.mini3.author") },
  ];

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
            {parts[0]}
            {highlightText}
            {parts[1]}
          </blockquote>
          <footer className="mt-8 flex items-center gap-3">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gold font-display text-ink">
              M
            </span>
            <div>
              <p className="font-semibold text-text-dark">{t("landing.testimonial.author")}</p>
              <p className="text-sm text-muted-dark">{t("landing.testimonial.authorSub")}</p>
            </div>
          </footer>
        </div>

        <div className="mt-14 grid gap-4 border-t border-border-d pt-8 sm:grid-cols-3">
          {testimonials.map((t_item) => (
            <p key={t_item.a} className="text-sm text-text-dark/90">
              "{t_item.q}"<br />
              <span className="text-muted-dark">— {t_item.a}</span>
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  const { t } = useI18n();

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
          {t("landing.cta.title")}
          <br />
          <span style={{ color: "#F2C24B" }}>{t("landing.cta.subtitle")}</span>
        </h2>
        <div className="mt-10 flex flex-col items-center gap-3">
          <Link to="/auth/sign-in">
            <PMButton variant="primaryDark">
              {t("landing.hero.cta")} <PMIcon name="arrow" stroke="#1C1813" />
            </PMButton>
          </Link>
          <p className="text-xs text-muted-dark">{t("landing.cta.setupTime")}</p>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const { t } = useI18n();

  const footerCols = [
    { h: t("landing.footer.product"), l: [t("landing.nav.howItWorks"), "Pricing", "Security"] },
    { h: t("landing.footer.company"), l: ["About", t("landing.nav.wins"), "Press"] },
    { h: t("landing.footer.legal"), l: ["Privacy", "Terms", "Disclosures"] },
  ];

  return (
    <footer className="border-t" style={{ background: "#15110B", borderColor: "#1E5A45" }}>
      <div className="container-pm py-14">
        <div className="grid gap-10 sm:grid-cols-[2fr_1fr_1fr_1fr]">
          <div>
            <img
              src="/wordmark.png"
              alt="PlayMoney"
              className="h-8 w-auto"
              width={148}
              height={32}
            />
            <p className="mt-3 max-w-xs text-sm text-muted-dark">{t("landing.footer.tagline")}</p>
            <p className="mt-6 text-xs text-muted-dark">
              <PMIcon
                name="shield"
                stroke="#A8C0B4"
                width={14}
                height={14}
                className="inline -mt-0.5"
              />{" "}
              {t("landing.footer.neverHold")}
            </p>
          </div>
          {footerCols.map((c) => (
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
          className="mt-12 grid items-center gap-4 border-t pt-6 text-center sm:grid-cols-3 sm:text-left"
          style={{ borderColor: "#1E5A45" }}
        >
          <p className="text-xs text-muted-dark">{t("landing.footer.copyright")}</p>
          <div className="flex items-center justify-center gap-2 text-xs font-medium text-muted-dark">
            <span>Powered by</span>
            <img
              src="/apex-wordmark-logo.png"
              alt="APEX-OmniHub"
              className="h-4 w-auto sm:h-5"
              width={824}
              height={125}
            />
          </div>
          <p className="text-xs text-muted-dark sm:text-right">
            {t("landing.footer.nonCustodial")}
          </p>
        </div>
      </div>
    </footer>
  );
}
