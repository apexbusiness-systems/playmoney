-- 0007_recovery_saga — P5 durable, idempotent recovery lifecycle saga. Idempotent.
--
-- Each row tracks ONE lifecycle run for a recovery. The saga progresses through
-- steps: detect → draft → reviewed → approved → executed → confirmed → fee_settled.
-- In BUILT mode the 'executed' step is always sealed by the mode/gate check; the
-- saga still advances through all non-execute steps so the data model is correct.
--
-- Compensation: if a step fails irreversibly, `compensated = true` is set and no
-- further forward progress is attempted (zero silent failures). A saga may only be
-- re-run by creating a new row with a fresh idempotency key (no mutation of a
-- failed saga row).
--
-- NO fund-holding surface: the saga table tracks STATE only. Money moves via the
-- separate fee_charges ledger (0004, causation-gated) and the external payout
-- (the user's own bank account — never through PlayMoney). Abort-trigger #1 does
-- not apply here.

create table if not exists public.recovery_sagas (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null references auth.users(id) on delete cascade,
  recovery_id       uuid not null references public.recoveries(id) on delete cascade,
  status            text not null default 'pending'
                      check (status in ('pending','approved','executed','confirmed','fee_settled','failed')),
  current_step      text not null default 'detect'
                      check (current_step in ('detect','draft','reviewed','approved','executed','confirmed','fee_settled')),
  idempotency_key   text not null,
  compensated       boolean not null default false,
  error_detail      text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (owner_id, idempotency_key)
);

create index if not exists idx_saga_owner_recovery on public.recovery_sagas (owner_id, recovery_id);
create index if not exists idx_saga_status on public.recovery_sagas (status);

alter table public.recovery_sagas enable row level security;

drop trigger if exists trg_saga_updated_at on public.recovery_sagas;
create trigger trg_saga_updated_at before update on public.recovery_sagas
  for each row execute function public.set_updated_at();

drop policy if exists saga_select_own on public.recovery_sagas;
create policy saga_select_own on public.recovery_sagas
  for select using (auth.uid() = owner_id);
-- Saga rows are created and advanced only by the server-side lifecycle; no tenant
-- write policy — the service role drives all state transitions.
