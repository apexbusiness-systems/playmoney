# 03 · Decision Log (append-only)

Record every decision, YELLOW-lane assumption, and STOP here. Newest at bottom.

---
### 2026-06-14 · D-001 · omni-recall created
Created this folder to bake durable state in from the start (no prior session memory; no
omni-recall existed at recon). Source-of-truth = repo; target = Rev.3 spec (`01-compliance-map.md`).

### 2026-06-14 · D-002 · Avenue taxonomy mismatch (OPEN)
`RecoveryAvenue` in `src/lib/playmoney/types.ts` enumerates *problem types*
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
- `recovery_events` audit row written on every outcome (approved_executed | approved_sealed |
  rejected_*); `approvals` consent record always written. Status "on_the_way" persisted only
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
