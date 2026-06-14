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
  Pending confirmation; flagged because it adds a dependency to a Lovable scaffold.

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

### 2026-06-14 · INVARIANT REMINDER
App default mode = BUILT. `canGoLive()` must return false until all gates green. No code path,
flag, seed, or test may set LIVE. Secrets only via env; never in code or this folder.
