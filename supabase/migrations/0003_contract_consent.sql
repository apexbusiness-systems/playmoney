-- 0003_contract_consent — M3 Consumer e-contract + PAD/Consent (#11, #12). Idempotent.
-- agreements: published legal docs (public read). user_acceptances: immutable
-- acceptance records. pad_consents: Rule H1 PAD / card-on-file consent w/ advance
-- notice + cancellation path.

create table if not exists public.agreements (
  id           uuid primary key default gen_random_uuid(),
  type         text not null check (type in ('tos','privacy','pad')),
  version      text not null,
  title        text not null,
  content_hash text not null,
  body_url     text,
  published_at timestamptz not null default now(),
  unique (type, version)
);
alter table public.agreements enable row level security;
-- Published legal documents are public to read; writes via service role only.
drop policy if exists agreements_public_read on public.agreements;
create policy agreements_public_read on public.agreements for select using (true);

create table if not exists public.user_acceptances (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null references auth.users(id) on delete cascade,
  agreement_type    text not null check (agreement_type in ('tos','privacy','pad')),
  agreement_version text not null,
  content_hash      text not null,
  accepted_at       timestamptz not null default now()
);
alter table public.user_acceptances enable row level security;
-- Owner reads + inserts own acceptances. No update/delete policy => immutable.
drop policy if exists acceptance_select_own on public.user_acceptances;
create policy acceptance_select_own on public.user_acceptances
  for select using (auth.uid() = owner_id);
drop policy if exists acceptance_insert_own on public.user_acceptances;
create policy acceptance_insert_own on public.user_acceptances
  for insert with check (auth.uid() = owner_id);

create table if not exists public.pad_consents (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            uuid not null references auth.users(id) on delete cascade,
  method              text not null check (method in ('pad','card_on_file')),
  amount_basis        text not null,            -- advance notice of amount/date basis
  advance_notice_days integer not null check (advance_notice_days >= 0),
  cancellation_path   text not null,            -- cancellation + recourse (Rule H1)
  status              text not null default 'active' check (status in ('active','cancelled')),
  consented_at        timestamptz not null default now(),
  cancelled_at        timestamptz
);
alter table public.pad_consents enable row level security;
drop policy if exists pad_select_own on public.pad_consents;
create policy pad_select_own on public.pad_consents
  for select using (auth.uid() = owner_id);
drop policy if exists pad_insert_own on public.pad_consents;
create policy pad_insert_own on public.pad_consents
  for insert with check (auth.uid() = owner_id);
drop policy if exists pad_update_own on public.pad_consents;
create policy pad_update_own on public.pad_consents
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
