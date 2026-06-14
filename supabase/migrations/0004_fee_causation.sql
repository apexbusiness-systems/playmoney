-- 0004_fee_causation — M4 Fee-Causation engine (#13). Idempotent.
-- fee_charges is a SEPARATE merchant-charge ledger. It references a recovery ONLY
-- by id for causation/audit (#13) and shares NO settlement linkage with any payout
-- path (#2). A DB CHECK makes it impossible to mark a fee 'charged' unless it was
-- a confirmed recovery materially caused by PlayMoney with the DIY disclosure
-- acknowledged. Fee rate is constrained to the 20-30% benchmark band.

create table if not exists public.fee_charges (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            uuid not null references auth.users(id) on delete cascade,
  recovery_id         text not null,                 -- audit/causation link ONLY
  gross_amount_cents  bigint not null check (gross_amount_cents >= 0),
  fee_amount_cents    bigint not null check (fee_amount_cents >= 0),
  fee_rate            numeric(4,3) not null check (fee_rate >= 0.200 and fee_rate <= 0.300),
  confirmed_recovery  boolean not null default false,
  caused_by_playmoney boolean not null default false,
  disclosure_acked    boolean not null default false,
  status              text not null default 'pending'
                        check (status in ('pending','charged','refunded')),
  psp_charge_ref      text,                          -- PSP merchant charge id (no fund custody)
  idempotency_key     text not null,
  created_at          timestamptz not null default now(),
  unique (owner_id, idempotency_key),
  -- Causation gate at the data layer: a 'charged' fee MUST satisfy all three.
  constraint fee_causation_required check (
    status <> 'charged'
    or (confirmed_recovery and caused_by_playmoney and disclosure_acked)
  )
);

create index if not exists idx_fee_owner_recovery on public.fee_charges (owner_id, recovery_id);

alter table public.fee_charges enable row level security;
drop policy if exists fee_select_own on public.fee_charges;
create policy fee_select_own on public.fee_charges
  for select using (auth.uid() = owner_id);
-- Inserts/updates go through the service role (server-validated causation), so no
-- write policy is granted to tenants — read-only for the owner.
