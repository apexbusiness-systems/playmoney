-- 0006_recovery_domain — P1 consumer recovery domain (the ApiClient surface). Idempotent.
--
-- Recon gap (D-006): migrations 0001–0005 build the COMPLIANCE SPINE (profiles,
-- gates, audit, loa_tokens, agreements/consent, fee_charges, review_queue) but
-- give the consumer-facing recovery domain — Recovery / RecoveryEvent /
-- Notification / Approval (src/lib/playmoney/types.ts) — NO database home. This
-- migration adds it, RLS-scoped per tenant (#15), idempotency-keyed.
--
-- INVARIANTS PRESERVED:
--   • No fund-holding surface (#1): a recovery records amounts (cents) for
--     display + causation only; the only money DESTINATION remains the user's own
--     external payout_ref. Nothing here pools, escrows, or routes funds.
--   • The fee is NOT settled here — fees live in public.fee_charges (0004), the
--     separate PSP merchant-charge ledger. our_fee_cents below is a display
--     projection, never a settlement linkage (#2).
--   • Notifications are money-only (#16): a CHECK restricts type to the two kinds.

-- ── recoveries: one row per detected/processed recovery, owner-scoped ──────────
create table if not exists public.recoveries (
  id                 uuid primary key default gen_random_uuid(),
  owner_id           uuid not null references auth.users(id) on delete cascade,
  merchant           text not null,
  -- problem-type (RecoveryAvenue enum in types.ts). The administrative-avenue
  -- gate (#9) lives in compliance/avenues.ts; this is the user-facing problem tag.
  avenue             text not null
                       check (avenue in ('refund','fee_reversal','subscription','billing_error','double_charge')),
  reason             text not null,
  gross_amount_cents bigint not null check (gross_amount_cents >= 0),
  user_net_cents     bigint not null check (user_net_cents >= 0),
  our_fee_cents      bigint not null check (our_fee_cents >= 0),
  status             text not null default 'found'
                       check (status in ('found','needs_approval','on_the_way','landed')),
  idempotency_key    text not null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (owner_id, idempotency_key)
);

create index if not exists idx_recoveries_owner_created on public.recoveries (owner_id, created_at desc);

alter table public.recoveries enable row level security;

drop trigger if exists trg_recoveries_updated_at on public.recoveries;
create trigger trg_recoveries_updated_at before update on public.recoveries
  for each row execute function public.set_updated_at();

drop policy if exists recoveries_select_own on public.recoveries;
create policy recoveries_select_own on public.recoveries
  for select using (auth.uid() = owner_id);
drop policy if exists recoveries_insert_own on public.recoveries;
create policy recoveries_insert_own on public.recoveries
  for insert with check (auth.uid() = owner_id);
-- Status transitions (e.g. found -> needs_approval) update the owner's own rows.
drop policy if exists recoveries_update_own on public.recoveries;
create policy recoveries_update_own on public.recoveries
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- ── recovery_events: append-only audit trail per recovery (owner reads own) ────
create table if not exists public.recovery_events (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  recovery_id uuid not null references public.recoveries(id) on delete cascade,
  kind        text not null,
  note        text not null default '',
  ts          timestamptz not null default now()
);

create index if not exists idx_recovery_events_owner_recovery on public.recovery_events (owner_id, recovery_id, ts);

alter table public.recovery_events enable row level security;
drop policy if exists recovery_events_select_own on public.recovery_events;
create policy recovery_events_select_own on public.recovery_events
  for select using (auth.uid() = owner_id);
-- Appends happen via the executor/service role (truthful audit). No tenant write.

-- ── approvals: one row per approved recovery; approval_token = idempotency ─────
create table if not exists public.approvals (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references auth.users(id) on delete cascade,
  recovery_id    uuid not null references public.recoveries(id) on delete cascade,
  approval_token text not null,
  approved_by    text not null,
  ts             timestamptz not null default now(),
  unique (owner_id, approval_token)
);

create index if not exists idx_approvals_owner_recovery on public.approvals (owner_id, recovery_id);

alter table public.approvals enable row level security;
drop policy if exists approvals_select_own on public.approvals;
create policy approvals_select_own on public.approvals
  for select using (auth.uid() = owner_id);
drop policy if exists approvals_insert_own on public.approvals;
create policy approvals_insert_own on public.approvals
  for insert with check (auth.uid() = owner_id);

-- ── notifications: money-only (#16) per-tenant alerts ─────────────────────────
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  type        text not null check (type in ('money_landed','needs_signature')),
  recovery_id uuid not null references public.recoveries(id) on delete cascade,
  message     text not null,
  ts          timestamptz not null default now(),
  read        boolean not null default false
);

create index if not exists idx_notifications_owner_ts on public.notifications (owner_id, ts desc);

alter table public.notifications enable row level security;
drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications
  for select using (auth.uid() = owner_id);
drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
-- Inserts via service role (the detector/executor emits money-only notifications).
