import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { auth } from "@/lib/playmoney/client";
import { PMButton } from "@/components/pm/Button";
import { useI18n } from "@/lib/i18n/I18nProvider";

export const Route = createFileRoute("/bank/connect")({
  head: () => ({ meta: [{ title: "Connect your bank — PlayMoney" }] }),
  component: BankConnect,
});

function BankConnect() {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [sealed, setSealed] = useState(false);
  const { t } = useI18n();

  async function handleConnect() {
    setLoading(true);
    setErrorMsg("");
    try {
      const result = await auth.getFlinksConnectUrl();
      if (!result.ok) {
        // Honest sealed-until-live state — no real bank link exists yet.
        setSealed(true);
        setLoading(false);
        return;
      }
      // Redirect out to the Flinks iframe/OAuth flow.
      window.location.assign(result.connectUrl);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to generate bank link.";
      setErrorMsg(msg);
      toast.error(t("bank.connect.toastFailed"), { description: msg });
      setLoading(false);
    }
  }

  if (sealed) {
    return (
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gold/10 text-3xl">
          🔒
        </div>
        <h1 className="font-display mt-6 text-3xl font-semibold">
          {t("bank.connect.comingTitle")}
        </h1>
        <p className="mt-3 text-muted-dark leading-relaxed">{t("bank.connect.comingDesc")}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gold/10 text-3xl">
        🏦
      </div>
      <h1 className="font-display mt-6 text-3xl font-semibold">{t("bank.connect.mainTitle")}</h1>
      <p className="mt-3 text-muted-dark leading-relaxed">{t("bank.connect.desc")}</p>

      <div className="mt-8 rounded-xl border border-border-d bg-card p-6 text-left">
        <h3 className="font-semibold">{t("bank.connect.securityTitle")}</h3>
        <ul className="mt-4 space-y-3 text-sm text-muted-dark">
          <li className="flex items-start gap-2">
            <span className="text-gold">✓</span>
            {t("bank.connect.securityPoint1")}
          </li>
          <li className="flex items-start gap-2">
            <span className="text-gold">✓</span>
            {t("bank.connect.securityPoint2")}
          </li>
          <li className="flex items-start gap-2">
            <span className="text-gold">✓</span>
            {t("bank.connect.securityPoint3")}
          </li>
        </ul>
      </div>

      <PMButton
        variant="primaryDark"
        className="mt-8 w-full"
        onClick={() => void handleConnect()}
        disabled={loading}
      >
        {loading ? t("bank.connect.btnConnecting") : t("bank.connect.btnAgree")}
      </PMButton>

      {errorMsg && <p className="mt-4 text-sm text-red-500">{errorMsg}</p>}
    </div>
  );
}
