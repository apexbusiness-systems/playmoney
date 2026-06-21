# PlayMoney — Cloudflare Workers Deployment

This application is built with TanStack Start and Nitro (using the `cloudflare-module` preset) and is deployed to Cloudflare Workers.

This document describes deployment mechanics only. It does **not** claim release readiness. `PLAYMONEY_MODE` remains `BUILT` by default until go-live gates are independently verified and intentionally changed through operations.

## Prerequisites

- Node.js 22+ (required by current Wrangler)
- `bun` installed
- `wrangler` CLI authenticated (`bunx wrangler login`)
- Supabase project URL plus anon/publishable and service-role keys available
- Stripe, Flinks, and Plaid credentials available

## GitHub Actions Secrets

Production deploy builds must receive the public Supabase Vite values so the app cannot compile into a mock-client deployment.

### Build-time public Vite values

These are RLS-safe public values and may be embedded in browser bundles:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` or `VITE_SUPABASE_PUBLISHABLE_KEY` (modern alternative)

The deploy workflow also sets `VITE_PLAYMONEY_REQUIRE_SUPABASE_CONFIG=true` internally. If public Vite URL is missing, or if both public keys are missing, the build fails instead of silently using `MockApiClient`.

### RLS verification values

The CI RLS check runs only when all required values are available; otherwise it emits an explicit skip notice.

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` or `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — server-only; never expose with a `VITE_` prefix

## Cloudflare Runtime Secrets

Run these commands once per environment and paste the respective values when prompted. **Never commit these values to source control.**

```bash
# Server/runtime Supabase values
wrangler secret put SUPABASE_URL
# paste: https://your-project.supabase.co

wrangler secret put SUPABASE_ANON_KEY
# paste: your anon/publishable key

wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# paste: your rotated service-role key; server-only, never VITE_

wrangler secret put SUPABASE_TOKEN
# paste: your rotated management token

# Adapter secrets
wrangler secret put STRIPE_SECRET_KEY
# paste: sk_test_...

wrangler secret put FLINKS_API_URL
wrangler secret put FLINKS_CLIENT_ID
wrangler secret put PLAID_CLIENT_ID
wrangler secret put PLAID_SECRET
wrangler secret put PLAID_ENV

# Mode stays BUILT unless/until operations intentionally changes it after gates.
wrangler secret put PLAYMONEY_MODE
# paste: BUILT
```

> Do not set `VITE_SUPABASE_*` as Cloudflare runtime secrets for server-only use. They are build-time public values supplied by GitHub Actions during deploy builds.

## Deploy

```bash
bun run deploy
```

For preview deployments:

```bash
bun run deploy:preview
```

## Verify

1. Visit the deployed Workers URL.
2. Ensure you see the PlayMoney landing page.
3. Verify the auth flow: Sign in → check-email screen → OTP entry → dashboard.
4. Verify the `GET /api/health` endpoint correctly reports BUILT mode and gate status.
5. Run `bun run db:verify-rls` with `SUPABASE_URL`, an anon/publishable key, and `SUPABASE_SERVICE_ROLE_KEY` available before considering any release decision.
