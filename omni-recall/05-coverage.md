# 05 · Compliance Coverage & Residuals (§7 Definition of Done)

_Phase 2 complete: 2026-06-14. Updated: 2026-06-15 (branch `claude/admiring-cori-civ47c`)._
**Status: BUILT, not LIVE.** `PLAYMONEY_MODE` default BUILT; `canGoLive()` = false; live paths sealed.
Phases delivered since: P1 (D-006), P3 (D-007), P2 (D-008); P5/P6 partially scaffolded (see CLAUDE.md).
Verification (2026-06-15): `bun run typecheck` clean · `bun run test` = **128 passing / 20 files** ·
`bun run build` green · `bun run db:verify-rls` denies anon. `bun run lint` not yet green (prettier debt + 1 real).

## Coverage table (17 controls → enforcement → status)
| # | Control | Enforced by (file) | Test | Status |
|---|---------|--------------------|------|--------|
| 1 | Non-custodial by type | `compliance/money.ts` (no custody type), migration `0001` (no fund table) | `money.test` T1 | BUILT [GATE] |
| 2 | No netting | `money.ts` FeeCharge (no settlement field); `0004` fee_charges no payout linkage | `money.test`, `causation.test` | BUILT |
| 3 | Read-only bank data | `compliance/ports.ts` AccountDataPort (read-only, OAuth, no creds/init) | typecheck | BUILT |
| 4 | Fee via PSP merchant | `ports.ts` PayoutPort (fee-only, no fund movement) | typecheck | BUILT [GATE] |
| 5 | No advance/lending | `causation.ts` (fee only post-confirmed-recovery) | `causation.test` | BUILT |
| 6 | LOA-primary auth | `compliance/loa.ts` + migration `0002_loa` | `loa.test` T3 | BUILT [GATE] |
| 7 | MAN Mode executor | `compliance/executor.ts` (LOA + review + mode gate) | `executor.test` T3/T7 | BUILT [GATE] |
| 8 | Alberta geofence | `compliance/geofence.ts` | `geofence.test` T4 | BUILT [GATE] |
| 9 | 4 avenues; rest hard-OFF | `compliance/avenues.ts` | `avenues.test` T5 | BUILT |
| 10 | UPL guardrails | `compliance/upl.ts` | `upl.test` T6 | BUILT [GATE] |
| 11 | CPA internet-sales ToS | `compliance/contract.ts` + `0003` | `contract.test` | BUILT [GATE] |
| 12 | PAD/card consent (Rule H1) | `contract.ts` buildPadConsent + `0003` | `contract.test` | BUILT [GATE] |
| 13 | Fee-causation fairness | `compliance/causation.ts` + `0004` DB CHECK | `causation.test` T2 | BUILT [GATE] |
| 14 | Fraud/chargeback + review | `compliance/review.ts` + `0005` DB CHECK | `review.test` T7 | BUILT [GATE] |
| 15 | Privacy + RLS | all migrations RLS-enabled; `scripts/db/verify-rls.ts` | `db:verify-rls` T9 | BUILT [GATE] |
| 16 | CASL money-only notifs | `playmoney/types.ts` Notification enum | `notifications.test` T8 | BUILT |
| 17 | Founder shield (corp/insurance) | OPS, not code — `gates.server.ts` attestation plumbing only | — | [GATE] external |

## §6 Go-Live gate
`compliance/gates.ts` (10 keys + pure `canGoLive()`), `mode.ts` (`PLAYMONEY_MODE`, `assertLiveAllowed`),
`gates.server.ts` (`loadGateStatus`/`setGateAttestation` — ops-set, audited, never auto). DB store
`go_live_attestations` seeded all-OFF. `executor.ts` performs real effects ONLY when `isLiveEnabled`.

## §5 test assertions status
T1 ✅ · T2 ✅ · T3 ✅ · T4 ✅ · T5 ✅ · T6 ✅ · T7 ✅ · T8 ✅ · T9 ✅ (db:verify-rls) · T10 ✅.

## RESIDUALS (explicit)
- **Code is BUILT, not LIVE.** Go-live awaits external Alberta fintech counsel (G-counsel) +
  bound E&O/cyber insurance (G-insurance) — both ops/legal, set only via `setGateAttestation`.
- **SECURITY-001:** rotate `SUPABASE_SERVICE_ROLE_KEY` + `SUPABASE_TOKEN` (were in the publicly-
  visible env field) and relocate to a secret store.
- **YELLOW assumptions (D-003):** aggregator default Flinks; PSP default Stripe; fee 25% in 20-30%
  band. Adapters (Flinks/Stripe concrete impls) are interfaces only — not yet wired to real APIs.
- **Legal copy not drafted:** ToS/Privacy/PAD text is counsel's; M3 enforces required-field structure,
  not final wording.
- **UI wiring:** enforcement lives in the domain/service layer + DB; onboarding/settings React routes
  still use the mock client and are not yet wired to the geofence/consent/causation guards.
- **No CI workflow** exists in the repo; tests/typecheck/RLS run locally via bun scripts (P7).
- **Stack (2026-06-15, D-009):** Lovable scaffold purged; canonical stack = Cloudflare + GitHub +
  Supabase; deploy via Cloudflare Workers (Nitro `cloudflare-module`).
- **P6 onboarding seam (2026-06-15):** `OccupationStep` is built but not rendered by the onboarding
  route; `submitOnboardingFn` userId resolution is broken (`getUserById(payoutRef)`). Both pending P6-full.
