# 03 · Decision Log (append-only)

Record every decision, YELLOW-lane assumption, and STOP here. Newest at bottom.

---

### 2026-06-14 · D-001 · omni-recall created

Created this folder to bake durable state in from the start (no prior session memory; no
omni-recall existed at recon). Source-of-truth = repo; target = Rev.3 spec (`01-compliance-map.md`).

### 2026-06-14 · D-002 · Avenue taxonomy mismatch (OPEN)

`RecoveryAvenue` in `src/lib/playmoney/types.ts` enumerates _problem types_
(refund | fee_reversal | subscription | billing_error | double_charge), NOT the "4
administrative avenues" of Control #9. M7 (avenue registry) must reconcile: define the 4
administrative avenues explicitly and hard-DISABLE insurance/credit/DTC/US at registry level.
Do not conflate problem-type with avenue. **Open until M7.**

### 2026-06-14 · STOP-001 (RAISED then PARTIALLY LIFTED) · No backend → Supabase provisioned

- RAISED: Recon found a frontend-only mock prototype (no DB/Supabase/RLS/test runner).
  Rev.3 premise that #1/#4/#5/#7/#15/#16 scaffold "already exists" was false → ABORT #4 fired.
  Held off blind-building the 7 Supabase modules.
- UPDATE (06:13Z): User provisioned a Supabase instance. Env vars present (NAMES only):
  `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
  `SUPABASE_TOKEN`. Backend now exists → the "no backend" basis of STOP-001 is lifted.
- STILL OPEN: existing controls #4/#7/#15 remain MISSING in code; must be BUILT (not "verified
  existing"). Verify the Supabase project's current schema before building (it may be empty).
- STILL OPEN (external, not code): G-counsel, G-insurance remain ops/legal gates.

### 2026-06-14 · D-003 · YELLOW assumptions registered (proceed; revisit if repo dictates)

- Aggregator: default **Flinks** (Canada-first) for `AccountDataPort` (read-only, OAuth, no
  creds, no payment-init). Plaid acceptable alternative. Revisit when adapter is wired.
- PSP: default **Stripe** as merchant-of-record for fee-only `PayoutPort`. No wallet/stored-value.
- Fee: default **25%**, configurable, within the 20–30% benchmark band (#13).
- Test runner: none installed → will add **Vitest** (dev-only) to satisfy §5 "show the run".
  Pending confirmation; flagged because it adds a dev dependency.

### 2026-06-14 · D-004 · Foundation spine BUILT (phase 1)

Decisions confirmed by user: build now / rotate secrets after; add Vitest (dev); foundation-first.
Delivered + verified:

- DB access: no Supabase CLI here → migrations applied via **Management API SQL endpoint**
  (`scripts/db/migrate.ts`, `bun run db:migrate`). Idempotent via `private.schema_migrations`.
- Migration `supabase/migrations/0001_foundation.sql`: `public.profiles` (tenant boundary,
  tokenised `payout_ref` only), `public.go_live_attestations` (gate store, RLS no-policy =
  service-role-only), `public.audit_log` (append-only, owner-reads-own). ALL RLS-enabled.
- TS spine: `src/lib/compliance/money.ts` (non-custodial branded types — no custody surface),
  `gates.ts` (10 gate keys + pure `canGoLive()`), `mode.ts` (`PLAYMONEY_MODE` default BUILT +
  `assertLiveAllowed()`), `env.server.ts`, `supabase/{admin.server,client}.ts`.
- Tests (Vitest) GREEN: T1 (no custody type), T8 (money-only notifications), T10 (gate/mode).
  `bun run typecheck` clean. RLS proven: anon→[], service-role→10 rows.
- gates seeded all OFF (attested_true=0). PLAYMONEY_MODE unset → BUILT. canGoLive()=false.

NEXT (phase 2): build modules. Suggested order M2 (geofence) → M7 (avenues) → M1 (e-LOA) →
M7-wire MAN-Mode executor (#7) → M3 (ToS/PAD) → M4 (causation) → M6 (UPL linter) → M5 (review queue).

### 2026-06-14 · SECURITY-001 · Service-role key + SUPABASE_TOKEN exposed

The cloud env's plaintext env-var field is flagged "visible to anyone". It holds the SECRET
`SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS) and `SUPABASE_TOKEN` (management). User accepted:
build now, **rotate after**. ACTION FOR USER: rotate both in Supabase + relocate to a secret
store once the build settles. Never store these values in code or omni-recall.

### 2026-06-14 · D-005 · Phase 2 complete — 7 modules + MAN-Mode executor BUILT

All modules wired with schema+RLS, types, guards, tests, gate hooks. See `05-coverage.md`.

- M1 loa.ts/`0002` · M2 geofence.ts · M3 contract.ts/`0003` · M4 causation.ts/`0004` (DB CHECK)
  · M5 review.ts/`0005` (DB CHECK) · M6 upl.ts · M7 avenues.ts · #7 executor.ts + ports.ts.
- §6 plumbing: gates.ts/mode.ts (pure) + gates.server.ts/audit.server.ts (DB, ops-set).
- Verified: typecheck clean; **67 tests pass** (T1–T8,T10); `db:verify-rls` = 8/8 deny anon (T9).
- App remains **BUILT**; `canGoLive()`=false; executor seals real effects until LIVE+gates.
  Residuals tracked in `05-coverage.md` (counsel/insurance gates, secret rotation, adapter wiring,
  legal copy, UI wiring, CI).

### 2026-06-14 · INVARIANT REMINDER

App default mode = BUILT. `canGoLive()` must return false until all gates green. No code path,
flag, seed, or test may set LIVE. Secrets only via env; never in code or this folder.

### 2026-06-14 · D-006 · P1 — Real data layer behind the contract (BUILT)

Recon first: `bun install` ok; `bun run typecheck` clean; **67 tests pass** baseline (vitest).
Confirmed the §0 ground truth — compliance spine (P0/D-005) is BUILT; the gap is the data layer.

- **Gap found**: migrations `0001–0005` build the compliance SPINE only. The consumer-facing
  recovery domain (`Recovery`/`RecoveryEvent`/`Notification`/`Approval` in `playmoney/types.ts`)
  had **no DB home**. → added `0006_recovery_domain.sql` (recoveries/recovery_events/approvals/
  notifications), all RLS owner-scoped, idempotency-keyed, money-only notif CHECK (#16). No
  fund-holding surface; fees stay in `fee_charges` (0004).
- `src/lib/playmoney/supabase.ts` — `SupabaseApiClient`/`SupabaseAuthClient` implementing the
  contract: RLS-scoped reads/writes, **Zod-validated `rowTo*` mappers** (boundary), idempotent
  `approveRecovery`, fee-ledger projected from landed recoveries (mirrors mock). Auth is
  passwordless (OTP) → typed `MagicLinkSentError` when no live session.
- `src/lib/playmoney/client.ts` — pure `selectClients(cfg)`: real Supabase when
  `VITE_SUPABASE_URL`+`VITE_SUPABASE_ANON_KEY` present, else `MockApiClient` fallback. Routes
  `app.index`/`app.activity`/`app.settings` repointed to this seam (import-line diff only).
- `scripts/db/verify-rls.ts` PROTECTED list extended with the 4 new tables.
- **Verified**: `typecheck` clean; **vitest 77 pass** (+10: mappers, #16-at-boundary, selector,
  mock-fallback-intact); `bun run build` ok. RLS round-trip is reasoned-not-run here (no live creds).

### 2026-06-14 · D-007 · P3 — Recovery engine (pure, no I/O) (BUILT)

Built the proprietary core as pure functions (deterministic, no clock/IO) under `src/lib/engine/`:

- `situation.ts` `deriveSituations()` — duplicate-charge / fee / billing-error / subscription
  detection; each txn consumed at most once; stable output.
- `router.ts` `routeProblem()` — ProblemType → enabled `AvenueKey` via `AVENUE_REGISTRY`;
  disabled target → typed `avenue_disabled`. **Invariant proven by test**: default mapping is
  exhaustive over ProblemType and only ever targets enabled avenues; a disabled-mapping returns
  `avenue_disabled` (never a hit).
- `learning.ts` `LearningLoop` — win/loss per avenue over injectable `WinRateStore` (in-memory
  default); win-rate in [0,1], no division by zero; rankings best-first.
- **Verified**: `typecheck` clean; **vitest 87 pass** (+10 engine); engine has zero I/O imports.

### 2026-06-14 · NEXT

P2 (route approve through MAN-Mode executor + recovery_events audit) → P4 (port adapters,
sealed in BUILT) → P5 (lifecycle saga + fee_reversal e2e) → P6 (onboarding consent) → P7 (CI +
go-live health check). Pre-existing prettier debt in landing/route files: lint not yet green
project-wide (formatting only).

### 2026-06-15 · D-008 · P2 — MAN-Mode executor wired to approveRecovery (BUILT)

Discovered P2 was already fully implemented (recovery.functions.ts existed with the complete
compliance stack); CLAUDE.md phase table was simply not updated. Confirmed + verified:

- `src/lib/api/recovery.functions.ts`: `approveRecoveryFn` server fn routes every approval
  through `buildApprovalLoa` → `enqueueForReview`/`approveReview` → `executeRecoveryAction`.
  LOA built from click_accept (ETA SA 2001); review auto-approved on user consent; executor
  seals in BUILT, fires only when LIVE+all 10 gates green.
- `recovery_events` audit row written on every outcome (approved*executed | approved_sealed |
  rejected*\*); `approvals` consent record always written. Status "on_the_way" persisted only
  when executed — DB never lies; UI celebrates optimistically.
- `src/lib/api/recovery.functions.test.ts`: 9 tests covering BUILT-seal, partial gates, LIVE+
  all-green execute, zero-gate seal, all enabled avenues, LOA scope/expiry, avenue mapping.
- **Verified**: `bun install` (vitest was missing from container); **120 tests pass** (20 files).
  `PLAYMONEY_MODE` unset = BUILT; perform() never called without LIVE+gates.
- `0007_recovery_saga.sql` (recovery_sagas table) was already present from prior work.
  NEXT: P4 (port adapters, BUILT-sealed) → P5 (lifecycle saga) → P6 (onboarding/PAD) → P7 (CI).

### 2026-06-15 · D-009 · Stack canonicalized (Cloudflare+GitHub+Supabase); Lovable purged; P6 onboarding seam gap root-caused

- **Lovable purge**: removed `src/lib/lovable-error-reporting.ts` + its `__root.tsx` hook, the
  `@lovable.dev/vite-tanstack-config` dep, and the `bunfig.toml` release-age excludes; repointed
  `framer-motion`/`motion-*` tarballs from the `lovable-core-prod` mirror to `registry.npmjs.org`
  (identical sha512 integrity, `bun install` validated). `bun.lock` now has **0** Lovable references.
- **Stack canonical** (per user direction; cloud env carries Cloudflare tokens): CLAUDE.md's
  "do NOT introduce Cloudflare-Workers-specific infra" is **retired**. Deploy target is now
  **Cloudflare Workers** (Nitro `cloudflare-module`, `wrangler deploy`). Canonical stack =
  Cloudflare + GitHub + Supabase. `00-recon`, `05-coverage`, and CLAUDE.md updated to match.
- **P6 onboarding seam gap (root-caused)**: commit `5aabbf1` ("bake occupation & context discovery
  into onboarding") added `OccupationStep`, `rankByContext` (`situation.ts`), `0008_user_context`,
  and `saveContext` across mock/supabase/onboarding-fn + tests — but **never touched
  `routes/app.onboarding.tsx`**. Born-orphaned: every layer wired except the route seam, and no
  test guards the seam, so it merged green. Separately, `submitOnboardingFn` resolves the user via
  `getUserById(payoutRef)` (a PSP token, not an auth UUID) → always fails. Both are P6-full;
  tracked in CLAUDE.md Residuals. Fix plan: render `OccupationStep` in the route + add a route-seam
  test + request-session userId extraction.
- **Verified**: `typecheck` clean · **128 tests / 20 files** pass · `build` green · `bun.lock`
  Lovable-free. `lint` still carries 133 auto-fixable prettier + 1 real (`OccupationStep:36`).

### 2026-06-15 · D-010 · P6 — occupation/context step wired into onboarding (BUILT)

Closed the seam gap root-caused in D-009 (component built in `5aabbf1`, never rendered):

- `routes/app.onboarding.tsx` now a 4-step flow; step 2 renders `<OccupationStep>` and persists
  the captured `OccupationContext` via the `auth.saveContext` contract seam (RLS-session scoped in
  Supabase — `sb.auth.getUser()` — so it sidesteps the broken admin `getUserById(payoutRef)` path).
  Context save is non-blocking (ranking hint, not a gate): failure shows a toast and still advances.
- `OccupationStep` restyled to the pm brand tokens (ink/sand/gold + `PMButton`/`IconChip`) for
  visual coherence; fixed its real lint error (`no-unused-expressions` ternary → `if/else`).
- `routes/app.onboarding.seam.test.ts` added — a dep-free (node-env) source-level guard asserting
  the route imports + renders `OccupationStep` and calls `auth.saveContext`. This is the regression
  shield that was missing when the orphan merged green.
- **Verified**: `typecheck` clean · **131 tests / 21 files** pass · `build` green · the 1 real lint
  error is gone (only auto-fixable prettier remains).
- **Residual (honest)**: `rankByContext` (engine, `situation.ts`) is built + tested but **consumed
  nowhere** — its application point is the detection/ingest path (P4/P5), so saved context has no
  surfaced-wins effect yet. `submitOnboardingFn` userId resolution still broken (ToS/PAD/profile).

### 2026-06-15 · D-011 · P6 — onboarding persistence + context-ranked dashboard (BUILT)

Closed both residuals from D-010. Two independent units, fully wired + tested:

- **(a) Onboarding persists via the contract seam.** Added `auth.submitOnboarding(input)` to the
  AuthClient contract (mock + supabase), reusing the pure `processOnboarding` extracted into
  `onboarding.core.ts`. The Supabase impl resolves the user from the **RLS session**
  (`sb.auth.getUser()`) and writes `user_acceptances` / `pad_consents` / `profiles` under owner
  RLS (`auth.uid() = owner_id`, INSERT policies in `0003`/`0001`) — so it never needs the admin
  client. The broken `submitOnboardingFn` (`getUserById(payoutRef)`, a PSP token) was **removed**;
  `checkOnboardingStatusFn` kept (+ Zod-parsed its rows). `app.onboarding.tsx` now collects
  controlled payout/name (step 3) + ToS/Privacy/PAD consent checkboxes (step 4) and submits.
- **(b) Dashboard consumes the engine ranking.** Extracted `contextPriority` + a generic, pure,
  stable `rankByContextKey` in `situation.ts` (`rankByContext` now delegates). `app.index.tsx`
  fetches the profile and re-ranks `Recovery[]` by `avenue` when context exists ("Prioritized for
  you"). Detection unchanged — order only.
- **Tests**: `onboarding.client.test.ts` (mock submit: eligible persists, context saved,
  non-Alberta blocked without persisting) + `rank.test.ts` (priority resolution, generic rank,
  purity). Onboarding + auth focused suite **42 pass / 8 files**; full suite **139 pass / 23 files**;
  typecheck + build green; prettier-clean on all touched files; 0 real lint errors.
- **Remaining P6**: a live Supabase session needs the passwordless OTP confirm UI (signIn is
  magic-link); consent versions/hashes are placeholders until counsel supplies published agreements.

### 2026-06-16 · D-012 · P7 — CI workflow + prettier debt cleared (BUILT)

Added real GitHub Actions CI gating every PR + push to `main`, without weakening any invariant.

- **Workflow** (`.github/workflows/ci.yml`): pinned Bun `1.3.11` (`oven-sh/setup-bun@v2`),
  `bun install --frozen-lockfile`, then ordered steps `typecheck` → `lint` → `test` → `build`.
  Least-privilege `permissions: contents: read`; concurrency cancels superseded non-`main` runs.
  Build runs against the mock client (no `VITE_SUPABASE_*`) → fork-safe, secret-free, BUILT.
- **BUILT-invariant guard job**: a secret-free `grep` gate that FAILS the run if any non-test
  file (`*.ts/tsx/yml/yaml/env/sh/toml/json`) seeds the live mode (assignment form, excludes the
  `=== "LIVE"` comparison and `*.test.*` files that transiently set it to PROVE the seal — T10).
  `verify` runs `needs: invariant-guard`, so the gate must pass first.
- **`db:verify-rls` deliberately NOT in CI**: it requires `SUPABASE_SERVICE_ROLE_KEY`, the key
  SECURITY-001 flags for rotation. Wiring a live service-role key into Actions before rotation
  would itself be the compromise the user warned against; it stays an ops/local check until rotated.
- **Prettier debt cleared**: ran the project's own `bun run format` (95 files) so `bun run lint`
  is green project-wide — 0 errors; the only residue is 6 non-failing `react-refresh` warnings in
  vendored shadcn `ui/` components (co-exported variants; standard shadcn pattern, left as-is).
- **Verified locally** (parity with the CI steps): `typecheck` clean · `lint` exit 0 ·
  **139 tests / 23 files** pass · `build` green · invariant guard passes (no LIVE seeded). The
  guard regex was adversarially checked against the repo (test-file sets excluded; `===` excluded;
  workflow prose reworded so the gate doesn't self-trip).
- **Remaining P7**: a go-live health-check endpoint/job (confirm all 10 gates + BUILT default at
  deploy time) is still pending; `db:verify-rls` in CI awaits the SECURITY-001 key rotation.

### 2026-06-16 · D-013 · Responsive UI/UX pass — mobile/tablet/desktop verified with screenshots (BUILT)

Full visual QA across the 5 surfaces (`/`, `/app`, `/app/activity`, `/app/settings`,
`/app/onboarding`) × 3 viewports (mobile 390, tablet 820, desktop 1440) using a headless
Chromium harness that measured `scrollWidth` vs `clientWidth` per page and captured full-page +
viewport screenshots. Two **measured** mobile defects were found and fixed; everything else passed.

- **AppShell header overflow (all `/app` pages, +46px @390px)**: the center pill nav was always
  `flex`, so logo + 3 pills + bell + avatar exceeded the viewport and pushed the avatar off-screen.
  Fix: collapse the inline nav to `hidden sm:flex` (matching the already-responsive landing nav)
  and add an iOS-native **bottom tab bar** (`sm:hidden`, `fixed bottom-0`) with icon+label tabs,
  active-state coloring, `aria-current`, and `env(safe-area-inset-bottom)` padding. `main` gets
  bottom padding on mobile so content clears the bar.
- **Activity table overflow (mobile, +97px, clipped by `overflow-hidden`)**: a 4-column table can't
  fit 390px. Fix: render a **stacked card list** below `sm` (merchant + amount, reason + status)
  and keep the auditable `<table>` at `sm+` inside an `overflow-x-auto` guard.
- **Route-tree warning cleared**: `app.onboarding.seam.test.ts` (a co-located source-level guard,
  not a route) was renamed `-app.onboarding.seam.test.ts` (the router's `routeFileIgnorePrefix`),
  so it's excluded from route generation while Vitest still collects it (its relative read of
  `./app.onboarding.tsx` is unchanged).
- **Verified**: re-shot all 15 surface×viewport combos → **0 horizontal overflow, 0 console
  errors**; tablet/desktop show the inline header nav, mobile shows the pinned tab bar.
  `lint` exit 0 · `typecheck` clean · **139 tests / 23 files** · `build` green. (The Playwright
  harness was used locally for evidence only — not added as a dependency or wired into CI.)

### 2026-06-16 · D-014 · Release-blocker follow-up after PR #14 (BUILT, not release-ready)

PR #14 only added Node setup and swapped the header wordmark. This follow-up closed the real release
blockers it left untouched, while keeping `PLAYMONEY_MODE` unset/default `BUILT`:

- **Production mock-client safety**: `playmoney/client.ts` now has a pure
  `assertSupabaseConfigWhenRequired(cfg, require)` guard. The deploy workflow sets
  `VITE_PLAYMONEY_REQUIRE_SUPABASE_CONFIG=true` and passes only public `VITE_SUPABASE_URL` /
  `VITE_SUPABASE_ANON_KEY` into the build, so a production deploy build fails instead of silently
  selecting `MockApiClient`. Offline/local/PR CI mock fallback remains available because that guard
  flag is not set outside deploy.
- **RLS CI env correctness**: CI now maps `SUPABASE_URL`, `SUPABASE_ANON_KEY`, optional
  `SUPABASE_PUBLISHABLE_KEY`, and server-only `SUPABASE_SERVICE_ROLE_KEY` into the RLS step. The step
  emits explicit skip notices when required secrets are unavailable; when present it runs
  `bun run db:verify-rls`.
- **Alberta-only launch geofence**: `ENABLED_JURISDICTIONS` is exactly `CA/AB`; all U.S. states are
  blocked/deferred. Onboarding no longer offers the U.S. as an active selectable launch jurisdiction.
- **Docs**: `.env.example` and `DEPLOY.md` now distinguish build-time public Vite variables,
  server/runtime Supabase variables, and service-role/management secrets, and explicitly avoid any
  release-readiness claim.
- **Residual**: release still requires real GitHub/Cloudflare/Supabase secrets, RLS verification
  against the live project, external go-live gates, and the existing ops/legal blockers before LIVE.
