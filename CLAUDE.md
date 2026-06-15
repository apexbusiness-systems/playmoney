# CLAUDE.md — PlayMoney

Non-custodial consumer money-recovery app. _"We do the hard work, you just play with
the money." / "We don't promise, but we deliver."_ Default posture is **BUILT** (no real
external effects); **LIVE** is physically sealed behind 10 go-live gates.

## Stack — canonical: **Cloudflare + GitHub + Supabase** (do NOT introduce Temporal or Lovable)

- **Frontend**: TanStack Start (React 19) + TanStack Router + React Query + Vite + Tailwind v4
  + shadcn/Radix + framer-motion. Tooling/test runtime: **Bun**. TS **strict**.
- **Deploy**: **Cloudflare Workers** via Nitro `cloudflare-module` preset (`vite.config.ts`);
  `bun run build && wrangler deploy --config .output/server/wrangler.json`. CI/CD on **GitHub**.
- **Backend**: Supabase (Postgres + RLS + Auth). Server logic = TanStack Start
  `createServerFn` (see `src/lib/api/example.functions.ts`) — not Supabase Edge Functions.
- **DB**: `supabase/migrations/0001..0008`. `bun run db:migrate` (Management API SQL endpoint;
  idempotent via `private.schema_migrations`), `bun run db:verify-rls` (anon-denied proof).
- **Tests**: Vitest. `bun run test` · `bun run typecheck` · `bun run lint` · `bun run build`.

## House style (hard constraints)

- TS strict, **zero `any`**, **no `as any`**. Zod at every boundary (DB rows, server-fn input,
  external payloads). No `// TODO`, no placeholders, no partial impls, no hardcoded secrets.
- Money is **integer cents**, never float (`compliance/money.ts` `Cents`).
- Secrets only via `*.server.ts` reading `process.env` **inside a function** (edge binds
  per-request). Public/RLS-safe config via `VITE_*` / `import.meta.env`.
- Every new module ships its own `*.test.ts` and keeps the whole suite green.
- Path alias `@/* -> src/*`.

## Invariants — enforced in code; MAINTAIN, never weaken

1. **Non-custodial by TYPE** (`compliance/money.ts`). No type can hold/pool/route user funds;
   the only payout destination is the user's own tokenised `UserPayoutRef`. The fee is a
   SEPARATE PSP merchant charge, never netted from funds in transit. Adding a "PlayMoney holds
   funds" type is **abort-trigger #1**.
2. **BUILT default / LIVE sealed** (`compliance/mode.ts`). Real effects fire only when
   `PLAYMONEY_MODE==="LIVE"` **AND** `canGoLive(gates)` (all 10 gates green). `assertLiveAllowed()`
   / `isLiveEnabled()` re-check both. Everything builds & validates in BUILT but takes no real
   outbound action.
3. **MAN-Mode executor** (`compliance/executor.ts`). Every execute path goes through
   `executeRecoveryAction` = valid e-LOA (`loa.ts`) + human-approved review (`review.ts`) +
   sealed-unless-LIVE. No bypass.
4. **Avenue registry** (`compliance/avenues.ts`). Only the 4 enabled administrative avenues run
   (`merchant_refund`, `fee_reversal`, `billing_error_correction`, `subscription_cancellation`).
   Insurance / credit / DTC / US are hard-DISABLED; requesting one returns typed `avenue_disabled`.
5. **Fee causation** (`compliance/causation.ts` + `0004` DB CHECK). A fee is allowed only on a
   confirmed recovery materially caused by PlayMoney with the DIY-free disclosure acknowledged.
6. **Money-only notifications** (`Notification` enum = `money_landed | needs_signature`),
   **RLS per tenant**, **data minimization** (tokens, never raw credentials).

## Contract (the seam between UI and backend)

- `src/lib/playmoney/types.ts` — Zod domain models + `ApiClient` / `AuthClient` interfaces.
- `src/lib/playmoney/mock.ts` — `MockApiClient` / `MockAuthClient` (offline/CI default).
- `src/lib/playmoney/supabase.ts` — real `SupabaseApiClient` / `SupabaseAuthClient` (RLS-scoped,
  Zod-validated row mappers, idempotent approve).
- `src/lib/playmoney/client.ts` — **the single import seam**. `selectClients()` picks real
  Supabase when `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` are present, else the mock.
  App routes import `{ api, auth, formatMoney }` from here.

## Recovery engine (proprietary core, pure — no I/O) — `src/lib/engine/`

- `situation.ts` — `deriveSituations(BankTransaction[])`: deterministic detection of
  double-charges, fees, billing errors, subscriptions → `DetectedSituation` (tagged `ProblemType`).
- `router.ts` — `routeProblem()` maps a ProblemType → an **enabled** `AvenueKey` via the registry;
  disabled targets return typed `avenue_disabled`. Never returns a disabled avenue.
- `learning.ts` — `LearningLoop` records win/loss per avenue over an injectable `WinRateStore`.

## Phase plan & status

| Phase | Scope | Status |
|------:|-------|--------|
| P0 | Compliance spine (money/mode/gates/executor/loa/review/causation/avenues/contract/upl/geofence/ports) + `0001–0005` | ✅ done (D-004/D-005) |
| **P1** | Real Supabase `ApiClient`/`AuthClient` behind the contract + env selector + `0006` recovery domain; routes repointed; mock fallback intact | ✅ **done (D-006)** |
| **P2** | Route `approveRecovery` through `executeRecoveryAction` (LOA + review + mode/gates), write `recovery_events`, persist truthful status | ✅ **done (D-008)** |
| **P3** | Recovery engine (SituationModel / AvenueRouter / LearningLoop), pure + tested | ✅ **done (D-007)** |
| P4 | Real adapters behind ports (Flinks/Plaid read-only, Stripe fee-only) + OCR/email ingest; all guarded by `assertLiveAllowed` | ⬜ todo |
| P5 | Recovery lifecycle saga (server fns + job/saga table, idempotent, compensating); wire `fee_reversal` end-to-end; `settleFee` via causation → `fee_charges` | 🟡 partial — `0007_recovery_saga` + `lifecycle.functions` (`settleFee`) built & tested; end-to-end `fee_reversal` wiring pending |
| P6 | Onboarding/consent end-to-end (internet-sales e-contract + Rule H1 PAD + identity); gates read real captured data | 🟢 mostly wired — onboarding persists ToS/Privacy/PAD + profile + occupation context via `auth.submitOnboarding` (contract seam, RLS-owner writes; broken admin path removed); dashboard consumes `rankByContext`. Remaining: live Supabase needs the passwordless OTP session flow; consent versions are placeholders pending counsel |
| P7 | CI: lint+typecheck+build+test green; go-live health check; confirm BUILT default + every live path sealed | ⬜ todo |

## Project memory

`omni-recall/` is the persistent log: `00-recon-report`, `01-compliance-map`,
`02-invariants-and-lanes`, `03-decision-log` (D-00x), `04-go-live-gate`, `05-coverage`.
Append decisions there; never store secrets in it.

## Residuals / open items

- **SECURITY-001**: rotate `SUPABASE_SERVICE_ROLE_KEY` + `SUPABASE_TOKEN` (were in a publicly
  visible env field); relocate to a secret store.
- **Stack**: Lovable scaffold fully purged (D-009). Deploy target is **Cloudflare Workers**
  (Nitro `cloudflare-module` preset); canonical stack = Cloudflare + GitHub + Supabase.
- **lint debt**: ~130 auto-fixable prettier errors + 6 `react-refresh` warnings. The one real
  error (`no-unused-expressions`) is fixed. `bun run lint` not yet green project-wide (prettier
  only); `typecheck` · `test` (139) · `build` are green.
- **P6 onboarding (D-011)**: end-to-end through the contract seam. `app.onboarding.tsx` (4 steps)
  collects occupation context (step 2), payout token + legal name (step 3, controlled), and
  ToS/Privacy/PAD consent (step 4), then calls `auth.submitOnboarding`. Supabase impl resolves the
  user via the RLS session (`sb.auth.getUser()`) and writes `user_acceptances` / `pad_consents` /
  `profiles` under owner RLS — the broken admin `getUserById(payoutRef)` server fn was removed.
  The dashboard re-ranks wins by saved context via `rankByContextKey`. Remaining P6: a live
  Supabase session requires the passwordless OTP confirm UI; consent versions/hashes are
  placeholders until counsel supplies the published agreements.
- `SupabaseAuthClient.signIn` is passwordless (magic link) → throws typed `MagicLinkSentError`
  when no live session exists yet; the OTP-confirm UI flow is not wired (UI work for P6).
- Adapters (Flinks/Plaid/Stripe/OCR) are still port interfaces — concrete impls are P4.
- External gates `G-counsel` + `G-insurance` are ops/legal facts; code never auto-sets them.
