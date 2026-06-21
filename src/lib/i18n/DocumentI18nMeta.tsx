import { useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useI18n } from "./I18nProvider";

const titles: Record<string, string> = {
  "/": "PlayMoney — We do the hard work. You just play with the money.",
  "/auth/sign-in": "Sign in — PlayMoney",
  "/auth/check-email": "Check your inbox — PlayMoney",
  "/auth/callback": "Signing you in… — PlayMoney",
  "/app": "Your wins — PlayMoney",
  "/app/": "Your wins — PlayMoney",
  "/app/activity": "Activity — PlayMoney",
  "/app/settings": "Settings — PlayMoney",
  "/app/onboarding": "Get set up — PlayMoney",
  "/app/pipeline": "Found Refunds — PlayMoney",
  "/bank/connect": "Connect your bank — PlayMoney",
  "/bank/callback": "Scanning... — PlayMoney",
  "/payment/setup": "Payment Setup — PlayMoney",
};

const descriptions: Record<string, string> = {
  "/": "PlayMoney quietly recovers refunds, fees, and forgotten charges you're owed. Non-custodial. No win, no fee.",
};

const titlesFr: Record<string, string> = {
  "/": "PlayMoney — Nous faisons le travail difficile. Vous n'avez plus qu'à en profiter.",
  "/auth/sign-in": "Se connecter — PlayMoney",
  "/auth/check-email": "Vérifiez votre boîte de réception — PlayMoney",
  "/auth/callback": "Connexion en cours… — PlayMoney",
  "/app": "Vos gains — PlayMoney",
  "/app/": "Vos gains — PlayMoney",
  "/app/activity": "Activité — PlayMoney",
  "/app/settings": "Paramètres — PlayMoney",
  "/app/onboarding": "Configuration — PlayMoney",
  "/app/pipeline": "Remboursements trouvés — PlayMoney",
  "/bank/connect": "Connecter votre banque — PlayMoney",
  "/bank/callback": "Analyse en cours... — PlayMoney",
  "/payment/setup": "Configuration du paiement — PlayMoney",
};

const descriptionsFr: Record<string, string> = {
  "/": "PlayMoney récupère discrètement les remboursements, frais et abonnements oubliés qui vous sont dus. Sans garde de fonds. Aucun gain, aucun frais.",
};

export function DocumentI18nMeta() {
  const { locale } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (typeof document === "undefined") return;

    // Normalise trailing slash if any
    const route = pathname === "/" ? "/" : pathname.replace(/\/$/, "");

    const activeTitles = locale === "fr" ? titlesFr : titles;
    const activeDescs = locale === "fr" ? descriptionsFr : descriptions;

    const matchedTitle = activeTitles[route] || activeTitles["/app"] || "PlayMoney";
    const matchedDesc = activeDescs[route];

    document.title = matchedTitle;

    // Open Graph Title
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute("content", matchedTitle);

    const twitterTitle = document.querySelector('meta[name="twitter:title"]');
    if (twitterTitle) twitterTitle.setAttribute("content", matchedTitle);

    if (matchedDesc) {
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute("content", matchedDesc);

      const ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) ogDesc.setAttribute("content", matchedDesc);

      const twitterDesc = document.querySelector('meta[name="twitter:description"]');
      if (twitterDesc) twitterDesc.setAttribute("content", matchedDesc);
    }
  }, [pathname, locale]);

  return null;
}
