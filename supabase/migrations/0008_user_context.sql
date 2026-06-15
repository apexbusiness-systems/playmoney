-- 0008_user_context — occupation + context discovery baked into onboarding.
-- Adds a single JSONB column to profiles to store the OccupationContext shape
-- captured during the onboarding occupation step. Structure is enforced at the
-- application layer (OccupationContext Zod schema); the DB layer only guarantees
-- valid JSON. No fund surface. No additional PII beyond what profiles already holds.

do $$ begin
  if not exists (
    select 1 from private.schema_migrations where version = '0008'
  ) then

    alter table public.profiles
      add column if not exists user_context jsonb not null default '{}'::jsonb;

    insert into private.schema_migrations (version) values ('0008');
  end if;
end $$;
