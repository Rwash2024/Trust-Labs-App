-- Campaign Hub (marketing dashboard) cloud save. ALREADY APPLIED to the live project on 2026-11-17
-- (migrations "campaign_hub_state" and "campaign_hub_state_tighten_grants"). Kept here as documentation.
--
-- One shared row (id = 'main') holding the whole plan as JSON. Only accounts whose
-- app_metadata.role = 'admin' can read, insert or update it (same pattern as packages, tests, branches...).
-- No delete. `version` supports optimistic concurrency: the dashboard updates "where version = <the one it loaded>".

create table if not exists public.campaign_hub_state (
  id text primary key,
  db jsonb not null,
  version integer not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid(),
  constraint campaign_hub_state_main_only check (id = 'main'),
  constraint campaign_hub_state_size check (octet_length(db::text) < 5000000)
);

comment on table public.campaign_hub_state is 'Shared plan of the Campaign Hub marketing dashboard (one row, id = main). Admin accounts only.';

alter table public.campaign_hub_state enable row level security;

-- Supabase grants everything to anon/authenticated by default: take it all back, then give only what is needed.
revoke all on table public.campaign_hub_state from anon, public;
revoke all on table public.campaign_hub_state from authenticated;
grant select, insert, update on table public.campaign_hub_state to authenticated;

create policy "campaign hub admin read" on public.campaign_hub_state
  for select to authenticated
  using ((((select auth.jwt()) -> 'app_metadata') ->> 'role') = 'admin');

create policy "campaign hub admin insert" on public.campaign_hub_state
  for insert to authenticated
  with check ((((select auth.jwt()) -> 'app_metadata') ->> 'role') = 'admin');

create policy "campaign hub admin update" on public.campaign_hub_state
  for update to authenticated
  using ((((select auth.jwt()) -> 'app_metadata') ->> 'role') = 'admin')
  with check ((((select auth.jwt()) -> 'app_metadata') ->> 'role') = 'admin');
