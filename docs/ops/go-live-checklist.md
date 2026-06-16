# PlayMoney Go-Live Ops Checklist

**Purpose**: Verification gates before cutting production traffic.

## 1. Security & Identity

- [ ] `SUPABASE_URL` and `SUPABASE_ANON_KEY` are rotated and match production.
- [ ] RLS policies verified (`bun run db:verify-rls`).
- [ ] GitHub Actions secrets injected and tested.
- [ ] Magic link auth domains allowlisted in Supabase Auth settings.

## 2. Payments (Stripe)

- [ ] Stripe live keys set in environment.
- [ ] Webhook signatures verified for live environment.
- [ ] Test mode tokenization stripped from production bundle.

## 3. Integrations (Flinks)

- [ ] Flinks live keys provisioned.
- [ ] OAuth redirect URIs point to `https://app.playmoney.ca/bank/callback`.
- [ ] Flinks IP allowlisting applied (if required by their prod environment).

## 4. Legal & Compliance

- [ ] Terms of Service (`terms-of-service.ts`) version matches signed copy.
- [ ] Privacy Policy (`privacy-policy.ts`) updated with correct support email.
- [ ] PAD Agreement (`pad-agreement.ts`) verified by compliance counsel.

## 5. Observability

- [ ] Sentry / Datadog / OTel tracing enabled.
- [ ] Health endpoint (`/api/health`) returning 200 and reachable.

## 6. Infrastructure (Cloudflare Workers)

- [ ] Domain configured in Cloudflare.
- [ ] Custom domain routed to the Worker.
- [ ] Environment variables pushed via `wrangler secret put`.

_Verified by: ****\*\*****\_\_\_****\*\***** Date: ****\*\*****\_\_\_****\*\*****_
