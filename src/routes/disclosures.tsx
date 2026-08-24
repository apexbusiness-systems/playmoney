import { createFileRoute, Link } from "@tanstack/react-router";
import { PAD_LATEST } from "@/legal/pad-agreement";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { LanguageSwitcher } from "@/components/pm/LanguageSwitcher";
import { PMCard } from "@/components/pm/Card";
import { PMIcon } from "@/components/pm/Icon";

export const Route = createFileRoute("/disclosures")({
  head: () => ({
    meta: [
      { title: "Legal Disclosures — PlayMoney" },
      {
        name: "description",
        content: "PlayMoney Pre-Authorized Debit (PAD) agreement and fee disclosures.",
      },
    ],
  }),
  component: DisclosuresPage,
});

function DisclosuresPage() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-sand text-ink">
      {/* Navigation Header */}
      <header
        className="sticky top-0 z-40 border-b"
        style={{ background: "#0E3B2D", borderColor: "#1E5A45" }}
      >
        <div className="container-pm flex h-16 items-center justify-between">
          <Link to="/" className="inline-flex items-center" aria-label="PlayMoney home">
            <img
              src="/wordmark.png"
              alt="PlayMoney"
              className="h-8 w-auto"
              width={148}
              height={32}
            />
          </Link>
          <div className="flex items-center gap-4">
            <LanguageSwitcher variant="dark" />
            <Link
              to="/"
              className="text-sm font-medium text-text-dark/90 hover:text-text-dark transition-colors"
            >
              {t("legal.nav.backHome")}
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container-pm py-12 sm:py-16">
        <div className="mx-auto max-w-3xl">
          <div className="border-b border-border-l pb-8">
            <p className="eyebrow text-ink-muted">
              {t("landing.footer.legal")} · v{PAD_LATEST.version}
            </p>
            <h1 className="h2-display mt-2">{t("legal.title.disclosures")}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-ink-muted">
              <span>
                {t("legal.meta.version")}:{" "}
                <strong className="font-semibold text-ink">{PAD_LATEST.version}</strong>
              </span>
            </div>
          </div>

          {/* Fee & PAD Structure Summary */}
          <div className="mt-8 space-y-6">
            <PMCard pad="md">
              <h2 className="font-display text-lg font-semibold text-ink">
                {t("legal.meta.feeBasis")}
              </h2>
              <p className="mt-2 text-sm text-ink-muted">{PAD_LATEST.amountBasis}</p>
              <div className="mt-4 pt-4 border-t border-border-l">
                <h3 className="font-display text-sm font-semibold text-ink">
                  {t("legal.meta.cancellation")}
                </h3>
                <p className="mt-1 text-xs text-ink-muted">{PAD_LATEST.cancellationPath}</p>
              </div>
            </PMCard>

            {/* Legal Review Placeholder Callout */}
            <PMCard pad="lg">
              <div className="flex items-start gap-4">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold/20 text-gold text-xl">
                  <PMIcon name="shield" stroke="#E6A92E" width={20} height={20} />
                </span>
                <div>
                  <h2 className="font-display text-lg font-semibold text-ink">
                    {t("legal.placeholder.title")}
                  </h2>
                  <div className="mt-3 rounded-lg border border-gold/40 bg-gold/10 p-4 text-sm font-medium text-ink">
                    ⚠️ {t("legal.placeholder.notice")}
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-ink-muted">
                    {t("legal.placeholder.desc")}
                  </p>
                </div>
              </div>
            </PMCard>
          </div>
        </div>
      </main>
    </div>
  );
}
