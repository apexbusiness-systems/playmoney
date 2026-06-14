-- 0002_loa — M1 e-LOA / Authorization (Control #6). Idempotent.
-- Per-recovery, scope-limited, revocable Letter of Authorization with an
-- Electronic Transactions Act (SA 2001 c E-5.5)-valid e-signature record. The
-- signed token is what MAN Mode (#7) requires per execute action.

create table if not exists public.loa_tokens (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            uuid not null references auth.users(id) on delete cascade,
  recovery_id         text not null,
  -- scope (scope-limited authority) ----------------------------------------
  avenue              text not null,
  merchant            text not null,
  max_amount_cents    bigint not null check (max_amount_cents >= 0),
  is_assignment       boolean not null default false, -- only if counterparty requires
  -- e-signature (ETA SA) ----------------------------------------------------
  signed_by           text not null,
  signed_at           timestamptz not null default now(),
  signature_method    text not null,
  signature_statement text not null,
  consent_electronic  boolean not null,
  -- lifecycle ---------------------------------------------------------------
  status              text not null default 'active' check (status in ('active','revoked','expired')),
  expires_at          timestamptz not null,
  revoked_at          timestamptz,
  idempotency_key     text not null,
  created_at          timestamptz not null default now(),
  unique (owner_id, idempotency_key)
);

create index if not exists idx_loa_owner_recovery on public.loa_tokens (owner_id, recovery_id);

alter table public.loa_tokens enable row level security;

drop policy if exists loa_select_own on public.loa_tokens;
create policy loa_select_own on public.loa_tokens
  for select using (auth.uid() = owner_id);

drop policy if exists loa_insert_own on public.loa_tokens;
create policy loa_insert_own on public.loa_tokens
  for insert with check (auth.uid() = owner_id);

-- Revocation only (status -> revoked). Owner may update their own rows.
drop policy if exists loa_update_own on public.loa_tokens;
create policy loa_update_own on public.loa_tokens
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
