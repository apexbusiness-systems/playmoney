# 00 · Recon Report

_Recon date: 2026-06-14. Branch: `claude/compassionate-bardeen-xg06iy`._
Labels: **VERIFIED** = opened/ran the artifact · **INFERRED** = deduced · **MISSING** = not present.

> ⚠️ **HISTORICAL SNAPSHOT — SUPERSEDED (preserved for audit integrity).** This recon captured the
> _starting_ state on 2026-06-14: a frontend-only mock with no backend. Since then the full
> compliance spine, the Supabase backend (migrations `0001–0008`, RLS), the recovery engine, and a
> Vitest suite (**128 tests**) have been built — see `03-decision-log` (D-004→D-009) and
> `05-coverage` for current state. The "ABORT TRIGGER #4 / mock prototype" findings below are no
> longer current truth; they are kept verbatim as the historical record only.

## Stack (VERIFIED)

- TanStack Start (`@tanstack/react-start`) + React 19 + `@tanstack/react-router`.
- Vite 7, Bun (`bun.lock`, `bunfig.toml`), TypeScript `strict` (`tsconfig.json`).
- Tailwind v4, Zod 3.24, framer-motion, recharts. Deploy target: Cloudflare Workers via
  Nitro `cloudflare-module` preset (canonical stack: Cloudflare + GitHub + Supabase).
- Scripts (`package.json`): `dev`, `build`, `build:dev`, `preview`, `lint` (eslint),
  `format` (prettier). **No `test` script. No test runner installed.**

## Persistence (VERIFIED)

- **No database, no Supabase, no Postgres, no migrations, no RLS.**
- State = in-memory `MockApiClient` / `MockAuthClient` singletons in
  `src/lib/playmoney/mock.ts` with hardcoded seed data.
- `db0` in `bun.lock` is a transitive nitro peer dep — unused.
- Server config stub: `src/lib/config.server.ts` (`getServerConfig()`), no secrets wired.

## Domain model (VERIFIED) — `src/lib/playmoney/types.ts` (Zod)

- `RecoveryStatus` = found | needs_approval | on_the_way | landed
- `RecoveryAvenue` = refund | fee_reversal | subscription | billing_error | double_charge
  - ⚠️ These are problem-types, **not** the "4 administrative avenues" of Control #9.
    Map/registry reconciliation is an OPEN item (see decision log D-002).
- `Profile` (has `payoutRef`: "tokenised reference, never raw credentials")
- `Situation`, `Recovery` (grossAmount/userNet/ourFee in cents, `idempotencyKey`),
  `RecoveryEvent`, `Approval` (`approvalToken`), `FeeLedgerEntry`, `Notification`.
- `Notification.type` = enum["money_landed","needs_signature"] — **#16 satisfied at type level.**
- Interfaces `ApiClient`, `AuthClient` are the seam where a real backend would plug in.

## Routes (VERIFIED) — `src/routes/`

- `index.tsx` (marketing), `app.tsx` (shell), `app.index.tsx`, `app.onboarding.tsx`
  (3-step UI, no jurisdiction gate, no ToS/PAD capture), `app.activity.tsx`, `app.settings.tsx`.

## Custody scan (VERIFIED clean)

- grep `escrow|fbo|pooled|wallet|stored_value|float|custod` → only marketing copy
  ("Non-custodial"). **No fund-holding surface.** Abort-#1 NOT triggered.

## Existing-control map vs Rev.3 claim ("#1,#4,#5,#7,#15,#16 already covered")

| #   | Control                  | Reality                                                                       | Verdict                   |
| --- | ------------------------ | ----------------------------------------------------------------------------- | ------------------------- |
| 1   | Non-custodial            | No fund table (no DB); `payoutRef` tokenised string; no typed `UserPayoutRef` | PARTIAL (true by absence) |
| 4   | Fee via PSP merchant     | No `PayoutPort`/PSP adapter; `FeeLedgerEntry` mock-only                       | **MISSING**               |
| 5   | No advance/lending       | No advance path                                                               | VERIFIED (by absence)     |
| 7   | MAN Mode executor        | `approveRecovery` idempotency-token only; no LOA-gated executor               | **DIVERGENT/MISSING**     |
| 15  | Data-min / RLS           | No DB → no RLS; `exportData`/`deleteAllData` on mock                          | **MISSING**               |
| 16  | Money-only notifications | `Notification.type` enum is exactly the 2 allowed                             | VERIFIED                  |

## Headline conclusion

The Rev.3 premise (a Supabase-backed app with RLS + MAN-Mode executor + PSP/aggregator
ports already exists) is **false** here. This is a **frontend-only mock prototype.**
→ **ABORT TRIGGER #4 fired** (§1.3): scaffold for #4/#7/#15 cannot be located.
Do **not** blind-build the 7 modules. A backend-architecture decision is required first
(see `03-decision-log.md` → OPEN-STOP-001).
