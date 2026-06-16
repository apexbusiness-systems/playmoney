# PlayMoney — Cloudflare Workers Deployment

This application is built with TanStack Start and Nitro (using the `cloudflare-module` preset) and is deployed to Cloudflare Workers.

## Prerequisites

- `bun` installed
- `wrangler` CLI authenticated (`bunx wrangler login`)
- Supabase project URL and keys available
- Stripe, Flinks, and Plaid credentials available

## One-time Secret Setup (run once per environment)

Run these commands and paste the respective values when prompted. **Never commit these values to source control.**

```bash
wrangler secret put VITE_SUPABASE_URL
# paste: https://your-project.supabase.co

wrangler secret put VITE_SUPABASE_ANON_KEY
# paste: your-anon-key

wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# paste: your-rotated-service-role-key (after rotating in Supabase dashboard)

wrangler secret put SUPABASE_TOKEN
# paste: your-rotated-management-token

wrangler secret put STRIPE_SECRET_KEY
# paste: sk_test_...

wrangler secret put FLINKS_API_URL
wrangler secret put FLINKS_CLIENT_ID
wrangler secret put PLAID_CLIENT_ID
wrangler secret put PLAID_SECRET
wrangler secret put PLAID_ENV

# Set the mode (BUILT by default)
wrangler secret put PLAYMONEY_MODE
# paste: BUILT  (change to LIVE only when all 10 gates are green)
```

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
4. Verify the `GET /api/health` endpoint correctly reports the gate status.
