-- 0010_omniport — APEX-OmniHub OmniPort connector tables (integration sidecar).
--
-- Idempotent (create ... if not exists). The migrate.ts runner records the applied
-- version in private.schema_migrations keyed by filename, same as 0001–0009 — this
-- file does NOT self-insert that bookkeeping row (matching the existing pattern).
--
-- SIDECAR: no fund-holding surface, no money columns, no payout refs — invariant #1
-- (non-custodial by type) is untouched. Both tables are service-role-only: RLS is
-- enabled with NO policies, so anon/authenticated are denied by default, exactly like
-- public.go_live_attestations in 0001. OmniPort handlers use SUPABASE_SERVICE_ROLE_KEY,
-- which bypasses RLS.

-- ── Feature flags hot-edited by OmniHub SET_FEATURE_FLAG commands ──────────────
create table if not exists public.omniport_feature_flags (
  key        text primary key,
  value      text not null,
  updated_by text not null default 'omniport',
  updated_at timestamptz not null default now()
);

alter table public.omniport_feature_flags enable row level security;

-- Refresh updated_at on every update (the upsert conflict path) via the shared
-- helper defined in 0001. Inserts get updated_at from the column DEFAULT now().
drop trigger if exists trg_omniport_flags_updated_at on public.omniport_feature_flags;
create trigger trg_omniport_flags_updated_at before update on public.omniport_feature_flags
  for each row execute function public.set_updated_at();

-- ── Append-only audit log of every OmniPort command received ───────────────────
-- receipt defaults to '' so the row inserts before its id is known; the handler then
-- stamps receipt = id (the DB-generated row id that is also returned to OmniHub).
create table if not exists public.omniport_command_log (
  id          uuid primary key default gen_random_uuid(),
  command     text not null,
  payload     jsonb,
  receipt     text not null default '',
  executed_at timestamptz not null default now()
);

alter table public.omniport_command_log enable row level security;
-- No policies => anon/authenticated denied. Appends/reads happen via the service role.
