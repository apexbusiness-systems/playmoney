-- 0005_review_queue — M5 Fraud/Abuse + Human-Review-Before-Send (#14). Idempotent.
-- Every outbound/execute action drains ONLY from reviewed-and-approved rows. A
-- DB CHECK makes an 'approved' row impossible without a human reviewer recorded.

create table if not exists public.review_queue (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references auth.users(id) on delete cascade,
  recovery_id     text not null,
  action_type     text not null,
  payload         jsonb not null default '{}'::jsonb,
  attestation     jsonb not null,            -- user legitimacy attestation (#14)
  evidence        jsonb not null default '[]'::jsonb, -- captured evidence refs
  status          text not null default 'pending'
                    check (status in ('pending','approved','rejected')),
  reviewed_by     text,
  reviewed_at     timestamptz,
  decision_note   text,
  idempotency_key text not null,
  created_at      timestamptz not null default now(),
  unique (owner_id, idempotency_key),
  -- Human-review-before-send: a decided row MUST name its reviewer + time.
  constraint review_requires_reviewer check (
    status = 'pending' or (reviewed_by is not null and reviewed_at is not null)
  )
);

create index if not exists idx_review_owner_status on public.review_queue (owner_id, status);

alter table public.review_queue enable row level security;
drop policy if exists review_select_own on public.review_queue;
create policy review_select_own on public.review_queue
  for select using (auth.uid() = owner_id);
drop policy if exists review_insert_own on public.review_queue;
create policy review_insert_own on public.review_queue
  for insert with check (auth.uid() = owner_id);
-- Approve/reject is a reviewer action via the service role; no tenant update policy.
