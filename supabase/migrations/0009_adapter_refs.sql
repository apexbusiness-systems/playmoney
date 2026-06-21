-- 0009_adapter_refs — durable home for PSP / aggregator REFERENCES. Idempotent.
--
-- T1/payment.functions issue two external references once a user goes LIVE:
--   • stripe_customer_ref — the Stripe CUSTOMER id PlayMoney charges its separate
--     merchant fee against (NOT a payout destination, NOT a card number).
--   • aggregator_token    — the Flinks/Plaid OAuth login token used for read-only
--     transaction access (short-lived; never bank credentials).
--
-- These are stored as 1:1 attributes of the owner's profile (cardinality is exactly
-- one per user), so they live as columns on public.profiles rather than a child table:
-- no new RLS surface, they inherit profiles' owner-scoped select/insert/update policies
-- (0001), and there is nothing to join. They are REFERENCES, not money — invariant #1
-- (non-custodial by type) is untouched: nothing here holds, pools, or routes funds, and
-- the fee remains a separate PSP merchant charge (#2), never netted from funds in transit.

-- Idempotent column adds; the migrate.ts runner records the applied version
-- (private.schema_migrations) keyed by filename, same as 0001–0008.
alter table public.profiles add column if not exists stripe_customer_ref text;
alter table public.profiles add column if not exists aggregator_token text;
