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

### 2026-06-17 · D-014 · Jurisdiction policy model (refines PR #15)

PR #16 refines PR #15's Alberta-only implementation into a scalable jurisdiction policy model.
It preserves PR #15's production Supabase guard and CI/RLS env fixes unchanged. It does **not**
make PlayMoney release-ready.

- **Production mock-client safety** (preserved from PR #15): `playmoney/client.ts` exports
  `assertSupabaseConfigWhenRequired(cfg, require)`. The deploy workflow sets
  `VITE_PLAYMONEY_REQUIRE_SUPABASE_CONFIG=true` and passes public `VITE_SUPABASE_URL` /
  `VITE_SUPABASE_ANON_KEY` into the build, so a production deploy build fails instead of
  silently selecting `MockApiClient`. Offline/local/PR CI mock fallback is unchanged.
  `vite.config.ts` enforces the same at build time via `assertProductionSupabaseBuildConfig`.
- **RLS CI env correctness** (preserved from PR #15): CI maps `SUPABASE_URL`,
  `SUPABASE_ANON_KEY`, optional `SUPABASE_PUBLISHABLE_KEY`, and server-only
  `SUPABASE_SERVICE_ROLE_KEY` into the RLS step, with explicit skip notices when secrets are
  absent; when present it runs `bun run db:verify-rls`.
- **Jurisdiction policy model** (replaces PR #15's hardcoded Alberta-only geofence):
  `compliance/geofence.ts` uses a 4-state policy registry (`enabled` / `pilot` / `waitlist`
  / `blocked`). Alberta (CA/AB) is `pilot` — the only active launch jurisdiction; onboarding
  proceeds. U.S. (all states) is `waitlist` — deferred pending legal/compliance gates, visible
  in the UI but not eligible for onboarding completion. Other Canadian provinces are `waitlist`
  by default. Quebec (CA/QC) is `blocked` with its distinct legal reason. `checkEligibility`
  returns `status` on both eligible and ineligible branches for UI/audit differentiation.
- **Onboarding** (replaces PR #15's disabled country selector): Country and province/state
  selectors are restored and active. Non-eligible jurisdictions show an inline eligibility note
  and disable the Continue button — users see the waitlist/blocked reason without being able
  to proceed. Alberta remains the only jurisdiction through which onboarding can complete.
- **Docs**: `.env.example` and `DEPLOY.md` distinguish build-time public Vite variables,
  server/runtime Supabase variables, and service-role/management secrets, and avoid any
  release-readiness claim.
- **Remaining blockers** (this PR does not address): P4 real adapters (Flinks/Plaid/Stripe
  concrete impls behind ports); P5 recovery initiation, lifecycle saga, and fee settlement
  trust model end-to-end; service-role ownership authz for admin paths; durable LOA/review
  queue; legal copy (ToS/Privacy/PAD text, counsel-supplied); privacy export/delete UX; full
  RLS tenant-isolation proof via `db:verify-rls` against a live project with rotated secrets
  (SECURITY-001); external go-live gates G-counsel and G-insurance (ops/legal, never auto-set);
  and ops/legal approval before `PLAYMONEY_MODE=LIVE`. `PLAYMONEY_MODE` remains `BUILT` by
  default; `canGoLive()` remains false.

### 2026-06-21 · D-015 · Documentation reconciliation + T1–T6 remediation (Path-A beta, BUILT)

Closed six verified, evidence-cited Path-A gaps (real adapter wiring, honest sample
labeling, real recovery initiation, fee-settlement trigger, adapter-ref persistence,
real-world payout capture). Plumbing + honesty only — the BUILT/LIVE seal was not
touched, weakened, or bypassed; no RED-lane file was edited.

**(a) Doc-status corrections (evidence-cited).**

- **P4 "todo" → BUILT.** Real adapters already shipped: `src/lib/adapters/account-data.ts`
  (Flinks CA + Plaid US, read-only, sealed by `assertModeIsLive`/`assertLiveAllowed`) and
  `src/lib/adapters/payout.ts` (Stripe fee-only). `ls` confirms both + `adapters.test.ts`.
- **P7 go-live health check "pending" → BUILT.** `src/lib/api/health.functions.ts` exists
  (read-only `HealthReport`: mode + `canGoLive` + per-gate green/external). CLAUDE.md row
  corrected; only `db:verify-rls`-in-CI remains (gated on SECURITY-001 key rotation).
- **Test-count baseline corrected.** `05-coverage.md` claimed `139/23` (dated 2026-06-15);
  the real pre-T1 baseline re-run here was **147 passing / 24 files** (`bun run test`). The
  doc carried a stale number; corrected to the freshly-run figure (no number carried forward).

**(b) T1–T6 built (file · what).**

- **T1 · `src/lib/api/bank.functions.ts`** — replaced the "Simulated server function" stub.
  Pure `ingestThroughAdapter` calls the real `createAccountDataAdapter` + `deriveSituations`;
  `buildFlinksConnectUrl` templates the real URL from env. The adapter's `LiveModeBlockedError`
  is caught and returned as a typed `sealed_until_live` (contract types in `types.ts`), never a
  fake success or unhandled 500. Routes `bank/connect.tsx` + `bank/callback.tsx` show honest
  "coming soon". Test proves the seal originates INSIDE the real adapter path.
- **T2 · `src/lib/api/situations.functions.ts` + `src/routes/app/pipeline.tsx`** — `getSituations`
  is mode-aware: LIVE derives real situations from ingested txns; BUILT returns the renamed
  `SAMPLE_SITUATIONS` tagged `{ sampleMode: true }`. Pipeline shows "Sample preview — these are
  example results. Real scanning unlocks at launch." (the misleading "found by our engines" copy
  is now gated behind `!sampleMode`). Sample data retained as a disclosed preview, not deleted.
- **T3 · `src/lib/playmoney/supabase.ts`** — `initiateRecovery` no longer throws "not implemented".
  `processInitiateRecovery` inserts an owner-scoped `recoveries` row (RLS session; integer-cents
  25% fee projection) and writes a `recovery_events` `initiated` audit row via the new admin
  `recordRecoveryInitiatedFn` (recovery_events stays service-role-only — RLS not weakened).
- **T4 · `src/lib/api/recovery.functions.ts`** — wired the orphaned `settleFee` trigger.
  `processRecoveryLanded` writes the `landed` event in the EXISTING recovery_events path then
  fires settlement exactly once; `markRecoveryLandedFn` is the status-transition server fn.
  Settlement stays sealed in BUILT (`LiveModeBlockedError` via `StripePayoutAdapter`), proven by
  test against the real `applySettleFee` path — not a silent no-op.
- **T5 · `supabase/migrations/0009_adapter_refs.sql`** — adds `stripe_customer_ref` +
  `aggregator_token` to `public.profiles` (idempotent `add column if not exists`). Chose COLUMNS
  over a child table: cardinality is exactly 1:1 with the user, so columns inherit profiles'
  owner-scoped RLS (0001) with zero new RLS surface and nothing to join. These are PSP/aggregator
  REFERENCES, not money — invariant #1 untouched. `saveAdapterRefs` (contract + mock + supabase,
  RLS-session) persists them; `payment/setup.tsx` now writes the Stripe ref to its own column
  (it had been mislabeled into `payout_ref`); `bank/callback.tsx` persists the aggregator token on
  LIVE ingest. Live application still requires `bun run db:migrate` against a real project, after
  which ops must re-run `bun run db:verify-rls` (no live creds in this environment).
- **T6 · `src/routes/app.onboarding.tsx`** — replaced the opaque "Routing token / tok\*payout**\*\*"
  field (no consumer could supply it) with a validated **Interac e-Transfer email\*\* capture
  (`type="email"`, `autoComplete="email"`, real `isValidEmail`), still writing the same `payout_ref`
  contract seam via `auth.submitOnboarding`. Variable renamed `payoutToken` → `payoutEmail`.

**(c) YELLOW assumptions — flagged for product/founder sign-off (proceeded per spec defaults).**

1. **T2 sample-mode labeling** — sample data is retained as a DISCLOSED product-preview state
   ("Sample preview … unlocks at launch") rather than deleted. Confirm this is the desired Path-A
   beta presentation.
2. **T6 Interac e-Transfer default** — chosen as the simplest non-custodial Canadian payout method
   (funds land in the user's own account, no new vendor integration). Confirm before LIVE, and
   confirm whether a tokenised PSP payout ref should coexist for non-Interac users.

**Verified** (freshly re-run, not assumed): `bun run typecheck` clean · `bun run lint` exit 0 ·
`bun run test` = **169 passing / 27 files** (baseline 147/24 + 22 new across bank/situations/
pipeline/supabase/recovery seam tests) · `bun run build` green. Seal re-checked at runtime:
`getMode()` = `BUILT` (PLAYMONEY_MODE unset), `canGoLive(empty)` = `false`,
`isLiveEnabled(empty)` = `false`. No non-test file assigns `PLAYMONEY_MODE = "LIVE"` (grep clean).
No RED-lane file (`money/mode/gates/executor/loa/causation/review/upl/avenues/geofence/ports`)
was edited; no fund-holding type or table introduced; SECURITY-001 keys untouched.

---

### 2026-06-21 · D-016 · Avenue-by-avenue payout mechanism (founder decision input)

**This is an open question for the founder/product, not a resolved decision. Nothing is marked BUILT or closed here.**

**Context.** D-002 noted an avenue taxonomy mismatch ("Open until M7"). M7 was built (`compliance/avenues.ts`): the 4-avenue registry exists, disabled avenues are hard-gated, and problem types map through `PROBLEM_TYPE_TO_AVENUE`. What D-002 never resolved — and what the code still does not answer — is the _money-path mechanics_ per avenue: does the recovered money return to the user automatically (MERCHANT-DIRECT, no PlayMoney rail needed) or must PlayMoney actively send money to the user's `payout_ref` (PLAYMONEY-INITIATED, needs a disbursement rail)?

**Evidence-based findings (no inference beyond what the code shows).**

| Avenue                      | Mechanism      | Evidence (file:line)                                                                                                                                                                                                                                        | Implication                                                                                                                                                                         |
| --------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `merchant_refund`           | **UNVERIFIED** | `ports.ts:1–11` — no "send-to-user" method exists by design; `recovery.functions.ts:299–306` — `perform()` when LIVE only writes `status='on_the_way'` in DB; no outbound merchant communication in any code path                                           | Non-custodial by type (MERCHANT-DIRECT intent), but the reversal-triggering mechanism is not built; `payout_ref` is never read in the execution path                                |
| `fee_reversal`              | **UNVERIFIED** | Same `perform()` path; `ports.ts:28–42` — `PayoutPort.chargeFee()` charges the user a fee, it does not send money to the user                                                                                                                               | Same: architectural intent is MERCHANT-DIRECT (bank reverses the fee back to the card), but no outbound communication exists                                                        |
| `billing_error_correction`  | **UNVERIFIED** | All 4 avenues share the single `processApproval → executeRecoveryAction → perform()` path; no avenue-specific handler diverges                                                                                                                              | Same                                                                                                                                                                                |
| `subscription_cancellation` | **UNVERIFIED** | Same; `money.ts:50` — `RecoveryDestination = UserPayoutRef` is declared but grep of every call site shows it is read nowhere in any execution path (defined, type-tested, displayed in Settings — never consumed by recovery approval/execution/settlement) | Same — though subscription cancellations are the avenue most likely to yield store credit or cheque rather than a card-network reversal, which is where MERCHANT-DIRECT breaks down |

**`payout_ref` current status.** Written to `profiles` during onboarding (T6: now an Interac e-Transfer email), displayed in Settings, never read by any recovery approval, execution, or settlement path. `ConfirmSheet.tsx:25` has a comment "populated from payoutRef in P4/P6" — flagging it as planned but not yet wired. As of today: zero of the four avenues consume it.

**The unresolved fork — questions for the founder.**

1. **Is every enabled avenue truly MERCHANT-DIRECT?** i.e. once PlayMoney sends the right communication to the merchant/bank/processor, do funds always return automatically to the user's original payment instrument, with no disbursement action required from PlayMoney? If yes, `payout_ref` stays display-only and no payout rail is needed at launch.

2. **What does PlayMoney actually SEND to cause a reversal?** The `perform()` callback at LIVE+gates currently only writes a DB row. The outbound communication (letter to merchant, API call to processor, chargeback filing) is entirely unimplemented. This is the largest open gap between the compliance spine and a working product.

3. **`subscription_cancellation` edge case.** Merchants frequently cancel a subscription but issue store credit or a future credit note rather than a card-network reversal. If PlayMoney pursues this avenue, the user may not receive cash automatically — PlayMoney may need to collect the credit and forward it. Does this avenue's scope include only direct card reversals, or also credit/voucher recoveries? If the latter, a disbursement rail (Interac e-Transfer for Business or PSP payout) is required and `payout_ref` becomes load-bearing.

4. **Interac e-Transfer as `payout_ref` (T6 YELLOW).** If any avenue is PLAYMONEY-INITIATED, `payout_ref` = Interac e-Transfer email is a real consumer-grade rail (funds land in the user's own account, no PlayMoney custody, no new vendor integration). Confirm this is the intended payout method, and confirm whether a tokenised PSP ref should coexist for non-Interac users.

**What this D-016 does NOT do.** It does not choose MERCHANT-DIRECT vs PLAYMONEY-INITIATED for any avenue, does not build a payout rail, does not change any compliance file, and does not mark P4/P5 status. It surfaces the gap so the founder can decide before LIVE wiring begins.

---

### 2026-06-21 · D-017 · P5 — RCP engine + merchant intake (BUILT, sealed)

Closes D-016's 4 open founder questions. Builds the Recovery Communication Package (RCP) engine and merchant contact intake. All outbound dispatch sealed behind `assertModeIsLive()` in BUILT; no real email sent until LIVE+gates.

**(a) D-016 founder rulings implemented.**

- **F-Q1 (MERCHANT-DIRECT)** — 3 avenues confirmed MERCHANT-DIRECT (merchant_refund, fee_reversal, billing_error_correction); subscription_cancellation is CONDITIONAL (card-reversal-only in scope — see F-Q3). `payout_ref` stays display-only; zero avenues require PlayMoney to initiate a disbursement at launch.
- **F-Q2 (perform() gap closed)** — `perform()` now builds + dispatches an RCP. Build happens outside the executor gate (validates package in BUILT); dispatch fires only when LIVE+gates via `RecoveryOutboundAdapter`. `RecoveryOutboundPort` added to `ports.ts`. Dispatch confirmed sealed: `assertModeIsLive()` in adapter throws `LiveModeBlockedError` before any network call. SENDGRID_API_KEY required at LIVE.
- **F-Q3 (subscription scope)** — `subscription_cancellation` scoped to card-reversal-only. Store-credit/voucher recoveries are EXPLICITLY OUT OF SCOPE. `checkSubscriptionEligibility(avenue, refundType)` is a pure exported gate; `approveRecoveryFn` runs it before the compliance stack (throws `IntakeRejectionError: not_eligible_credit_only`). Tested: store_credit → throws, original_payment_method → passes, non-subscription avenues → always pass.
- **F-Q4 (Interac e-Transfer)** — CONFIRMED display-only at Phase 0. `payout_ref` correctly captured as Interac e-Transfer email (T6); `RecoveryDestination = UserPayoutRef` retained as reserved capacity. No payout rail wired; no PLAYMONEY-INITIATED avenue at launch.

**(b) Files built.**

- **`src/lib/playmoney/recovery-comms.ts`** — `buildRecoveryCommPackage()`: pure, no I/O. 4 avenue templates with Canadian regulatory citations woven into the body (CPA 2002 s.25, FCAC, CBA, CRTC, OEB/AUC/BCUC). All output linted at generation time via `assertCleanCopy(upl.ts)` — UPL violations throw, never render. `UnsupportedAvenueError` for disabled avenues.
- **`src/lib/playmoney/merchant-directory.ts`** — `matchMerchant(txnDescription)`: contains-based fuzzy match (normalized, 3-char min alias, confidence ≥ 0.85). `buildMerchantContact(txnDescription)`: returns `MerchantContact` with `method:'directory'` (url/email from directory) or `method:'manual'` (no contact; user must supply). Seeded with top-50 Canadian dispute targets (telecom, streaming, SaaS, utilities, retail, delivery, fitness).
- **`src/lib/adapters/resend-outbound.adapter.ts`** — `createRecoveryOutboundAdapter()`: `RecoveryOutboundPort` impl. BUILT: `assertModeIsLive()` throws immediately. LIVE: dispatches via Resend (`RESEND_API_KEY`); missing key = explicit `LiveModeBlockedError` (LIVE configuration gate, not a silent no-op).
- **`src/lib/compliance/ports.ts`** — `RecoveryOutboundPort` + `RecoveryCommPackageRef` interfaces added. Comment updated to document the seal contract.
- **`src/lib/playmoney/types.ts`** — `MerchantContact`, `SubscriptionRefundType`, `IntakeRejectionError` (typed error, code `not_eligible_credit_only`) added. `ApiClient.approveRecovery` extended with `merchantContact: MerchantContact` (required) + `refundType?: SubscriptionRefundType`.
- **`src/lib/api/recovery.functions.ts`** — `checkSubscriptionEligibility()` exported pure gate. `approveRecoveryFn` updated: subscription gate runs first (Step 0), RCP built before executor (validates in BUILT), `perform()` dispatches RCP → writes `outbound_dispatched` audit event → writes `status='on_the_way'`. Sealed audit note when `approved_sealed` now records that RCP was built and well-formed.
- **`src/lib/playmoney/mock.ts` + `supabase.ts`** — `approveRecovery` signatures updated for new contract fields.
- **`src/routes/app.index.tsx`** — `buildMerchantContact(rec.merchant)` auto-resolves the contact from the directory on "Send it" tap. `refundType` not yet exposed in the UI (subscription gate available but intake UX is P6).

**(c) Flinks/Plaid merchant-contact resolution — CLOSED as NOT-UNCERTAIN.**

Neither Flinks nor Plaid surfaces merchant dispute-contact emails. Transaction descriptions are truncated/obfuscated strings (TELUS*MOBILITY, AMZN*MKTPLACE). The merchant directory is the resolution mechanism: seed directory → fuzzy-match → manual fallback. Verified in `merchant-directory.test.ts` against real Flinks/Plaid txn description patterns.

**(d) LIVE blockers added (no new gates — ops notes only).**

- `RESEND_API_KEY` must be configured before LIVE dispatch (throws `LiveModeBlockedError` if missing).
- `OUTBOUND_EMAIL_FROM` defaults to `recovery@playmoney.ca` — set before LIVE for branded sender.
- Subscription gate intake UX (refundType selection) not yet wired in the UI — users can still tap "Send it" on a subscription recovery. The server fn gate fires if `store_credit` is passed, but the UI currently passes no `refundType`, so the gate defaults to pass (undefined). UI intake for `refundType` is P6 work.

**Verified**: `bun run typecheck` clean · `bun run lint` exit 0 · `bun run test` = **197 passing / 29 files** (baseline 169/27 + 28 new: recovery-comms × 10, merchant-directory × 8, checkSubscriptionEligibility × 4, RCP-engine integration × 6) · `bun run build` green. BUILT seal re-confirmed: `assertModeIsLive()` throws in every outbound path; no non-test file sets `PLAYMONEY_MODE=LIVE`.
