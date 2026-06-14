-- 0001_foundation — PlayMoney compliance spine (Rev.3)
-- Idempotent. Establishes tenancy + RLS pattern, the Go-Live gate attestation
-- store, and an append-only audit log. NO fund-holding surface is created here
-- and none ever may be (abort-trigger #1).

-- ── Internal (non-PostgREST-exposed) schema for migration bookkeeping ──────────
create schema if not exists private;

create table if not exists private.schema_migrations (
  version    text primary key,
  applied_at timestamptz not null default now()
);

-- ── updated_at helper ─────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ── profiles: one row per auth user; the tenant boundary ──────────────────────
create table if not exists public.profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  display_name          text not null default '',
  -- tokenised UserPayoutRef ONLY — never raw bank credentials (#1,#3).
  payout_ref            text,
  -- jurisdiction is set by the geofence module (M2); default OFF/unknown.
  jurisdiction_province text,
  jurisdiction_country  text not null default 'CA',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (auth.uid() = id);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
-- No delete policy: profiles are removed only via auth.users cascade.

-- ── go_live_attestations: the Go-Live gate store (ops-set, code-checked) ───────
-- RLS enabled with NO policies => unreachable to anon/authenticated. Only the
-- service role (which bypasses RLS) may read/write. Code NEVER auto-sets the
-- external gates (G-counsel, G-insurance).
create table if not exists public.go_live_attestations (
  gate_key     text primary key,
  attested     boolean not null default false,
  attested_by  text,
  evidence_url text,
  note         text,
  updated_at   timestamptz not null default now()
);

alter table public.go_live_attestations enable row level security;

drop trigger if exists trg_gla_updated_at on public.go_live_attestations;
create trigger trg_gla_updated_at before update on public.go_live_attestations
  for each row execute function public.set_updated_at();

-- Seed all gate keys as NOT attested (default OFF). On conflict, leave as-is.
insert into public.go_live_attestations (gate_key, attested) values
  ('G-counsel', false),
  ('G-noncustody', false),
  ('G-loa', false),
  ('G-geofence', false),
  ('G-avenues', false),
  ('G-contract', false),
  ('G-pad', false),
  ('G-causation', false),
  ('G-fraud', false),
  ('G-insurance', false)
on conflict (gate_key) do nothing;

-- ── audit_log: append-only; owner reads own rows; writes via service role ──────
create table if not exists public.audit_log (
  id         bigint generated always as identity primary key,
  actor      uuid,
  owner_id   uuid,
  action     text not null,
  detail     jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.audit_log enable row level security;

drop policy if exists audit_select_own on public.audit_log;
create policy audit_select_own on public.audit_log
  for select using (auth.uid() = owner_id);
-- No insert/update/delete policies: appends happen via the service role only,
-- making the log effectively append-only for all tenants.
