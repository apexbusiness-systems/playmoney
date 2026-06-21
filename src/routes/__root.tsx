import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { type ReactNode } from "react";
import { I18nProvider, useI18n } from "@/lib/i18n/I18nProvider";
import { DocumentI18nMeta } from "@/lib/i18n/DocumentI18nMeta";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">{t("fallback.404.title")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("fallback.404.desc")}</p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("fallback.404.btn")}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  const { t } = useI18n();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {t("fallback.error.title")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("fallback.error.desc")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("fallback.error.btnTry")}
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            {t("fallback.error.btnHome")}
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "PlayMoney — We do the hard work. You just play with the money." },
      {
        name: "description",
        content:
          "PlayMoney quietly recovers the refunds, fees and forgotten charges you're owed. You don't lift a finger. No win, no fee.",
      },
      { name: "author", content: "PlayMoney" },
      {
        property: "og:title",
        content: "PlayMoney — We do the hard work. You just play with the money.",
      },
      {
        property: "og:description",
        content:
          "PlayMoney quietly recovers the refunds, fees and forgotten charges you're owed. You don't lift a finger. No win, no fee.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:title",
        content: "PlayMoney — We do the hard work. You just play with the money.",
      },
      {
        name: "twitter:description",
        content:
          "PlayMoney quietly recovers the refunds, fees and forgotten charges you're owed. You don't lift a finger. No win, no fee.",
      },
      {
        property: "og:image",
        content:
          "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/cbe203bb-3f67-4208-8d83-04e0bf67503e",
      },
      {
        name: "twitter:image",
        content:
          "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/cbe203bb-3f67-4208-8d83-04e0bf67503e",
      },
    ],
    links: [
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      // Fonts are self-hosted via @font-face in styles.css (no third-party CDN).
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <I18nProvider>
          {children}
          <DocumentI18nMeta />
        </I18nProvider>
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </QueryClientProvider>
  );
}
