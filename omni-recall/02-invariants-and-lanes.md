# 02 · Architecture Invariants & Execution Lanes

## Non-negotiable invariants (apply to every file)
1. **Non-custodial by type.** Recovery destination = `UserPayoutRef` only. No type/table
   lets PlayMoney hold or route user funds. Custody is a compile-time impossibility.
2. **Fee ↔ recovery separation.** `FeeLedger` and the payout path share no FK that could
   net one against the other. Fee is always a fresh PSP merchant charge to the user (#2,#4,#5).
3. **Ports are typed & minimal.** `AccountDataPort` (read-only, OAuth, no creds, no
   payment-init scope) and `PayoutPort` (PSP merchant fee-charge only) are interfaces;
   adapters cannot exceed their scope (#3,#4).
4. **Idempotent + reversible.** Every mutation idempotent (idempotency key); every action
   reversible/revocable; zero silent failures (typed Result; log every branch).
5. **Multi-tenant RLS sacred.** Every new table ships RLS policies; no cross-tenant access (#15).
6. **Secrets.** None in code or in this folder. Aggregator/PSP/Supabase secrets via env /
   secret store only (#3). Reference by env-var NAME, never value.
7. **Flags default OFF.** Every capability touching "going live" is a flag defaulting OFF (§6).

## Execution lanes
- **GREEN (act autonomously):** repo recon; read/update omni-recall; build/extend the 7
  modules; write schema/migrations/types/guards/tests; run typecheck + tests; keep all
  live flags OFF.
- **YELLOW (state assumption, proceed, flag in decision log):** ambiguous existing-module
  boundaries; aggregator choice (Flinks vs Plaid) / PSP specifics when repo is silent;
  fee benchmark default (20–30% band, default 25%, configurable).
- **RED (never do):** create any fund-holding / escrow / FBO / pooled / wallet /
  stored-value table or type; net a fee out of funds in transit; store bank credentials or
  request payment-initiation scope; enable any deferred avenue (insurance/credit/DTC/US);
  emit legal-advice/demand/litigation-threat copy; set app to LIVE; bypass MAN Mode; weaken
  RLS or multi-tenant isolation; commit secrets.

## Abort triggers (STOP and report)
- Change creates a money-custody path → "BLOCKED: would introduce fund custody (#1)."
- Execute action could run without a valid e-LOA token → STOP (#7).
- Change enables a deferred avenue or non-Alberta signup pre-gate → STOP (#8/#9).
- Existing scaffold for #1/#4/#5/#7/#15/#16 cannot be located or contradicts these rules
  → STOP and report; do not re-implement blindly.

## Hallucination firewall
- Open/run before claiming a file/table/test exists; cite the path.
- Unverifiable fact → output `[UNVERIFIED: <reason>]`, proceed via YELLOW; never invent.
- Never report a test passing without showing the run.
