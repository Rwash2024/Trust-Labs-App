-- Trust Labs App — live tracking of the home-visit chemist (Plan 1, web).
-- Run once in the Supabase SQL editor, AFTER every earlier migration in this
-- folder (in particular chat_bookings_migration.sql, booking_location_migration.sql,
-- spam_protection_migration.sql and branch_role_migration.sql). Safe to re-run.
--
-- What it does
--   1. Schema: chemists, chemist_pings, trip columns on bookings, role helpers.
--   2. Chemist lockout: a chemist account (app_metadata.role = 'chemist') gets
--      a RESTRICTIVE "chemist_blocked" policy on every public table that has
--      RLS on, so it can never read or write patient data directly. Chemists
--      reach their own visits only through the security-definer RPCs below.
--   3. bookings_guard_staff_edits: the trip columns join the "admin only"
--      list, and the trip RPCs get a transaction-local bypass (app.trip_rpc).
--   4. Retention + realtime: pings older than 30 days are deleted nightly;
--      chemist_pings and bookings are published to supabase_realtime.
--   5. RPCs (appended by the next task).
--
-- Roles: app_metadata.role is only settable server-side.
--   ''      -> staff (call center / branch) — the existing logged-in accounts
--   'admin' -> owner
--   'chemist' -> home-visit chemist (new)

-- ---------------------------------------------------------------------------
-- 1. Schema
-- ---------------------------------------------------------------------------

create or replace function public.app_role()
returns text
language sql
stable
set search_path = ''
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '')
$$;

create or replace function public.is_chemist()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(auth.role() = 'authenticated', false) and public.app_role() = 'chemist'
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(auth.role() = 'authenticated', false) and public.app_role() in ('', 'admin')
$$;

create table if not exists public.chemists (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  phone text not null unique,
  active boolean not null default true,
  created_at timestamptz default now()
);

create table if not exists public.chemist_pings (
  id bigserial primary key,
  booking_id uuid not null references public.bookings (id) on delete cascade,
  chemist_id uuid not null references public.chemists (id),
  lat double precision not null,
  lng double precision not null,
  accuracy_m real,
  at timestamptz not null default now()
);

create index if not exists chemist_pings_booking_at_idx on public.chemist_pings (booking_id, at desc);

-- Constraints are added as separate statements (not inline on ADD COLUMN IF
-- NOT EXISTS) so a re-run neither duplicates nor silently skips them.
alter table public.bookings add column if not exists assigned_chemist_id uuid;
alter table public.bookings add column if not exists track_token text;
alter table public.bookings add column if not exists trip_status text;
alter table public.bookings add column if not exists trip_started_at timestamptz;
alter table public.bookings add column if not exists trip_arrived_at timestamptz;

alter table public.bookings drop constraint if exists bookings_assigned_chemist_id_fkey;
alter table public.bookings add constraint bookings_assigned_chemist_id_fkey
  foreign key (assigned_chemist_id) references public.chemists (id);

alter table public.bookings drop constraint if exists bookings_track_token_key;
alter table public.bookings add constraint bookings_track_token_key unique (track_token);

alter table public.bookings drop constraint if exists bookings_trip_status_chk;
alter table public.bookings add constraint bookings_trip_status_chk
  check (trip_status in ('assigned', 'on_way', 'arrived', 'cancelled'));

create index if not exists bookings_assigned_chemist_idx on public.bookings (assigned_chemist_id)
  where assigned_chemist_id is not null;

-- bookings.source: no CHECK constraint exists in this repo (chat_bookings_migration.sql
-- declares it as plain text), so 'call_center' needs no widening here. In case one
-- was added by hand on the live project, list any CHECK on bookings that mentions
-- source so whoever applies this sees it.
do $$
declare
  c record;
begin
  for c in
    select conname, pg_get_constraintdef(oid) as def
    from pg_constraint
    where conrelid = 'public.bookings'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%source%'
  loop
    raise warning 'bookings has a CHECK mentioning source (%: %) — widen it to allow ''call_center''', c.conname, c.def;
  end loop;
end $$;

-- RLS on the new tables. Reads only; no insert/update/delete policies — every
-- write goes through the security-definer RPCs.
alter table public.chemists enable row level security;
alter table public.chemist_pings enable row level security;

drop policy if exists "staff read chemists" on public.chemists;
create policy "staff read chemists" on public.chemists
  for select to authenticated using (public.is_staff());

drop policy if exists "chemist reads own row" on public.chemists;
create policy "chemist reads own row" on public.chemists
  for select to authenticated using (public.is_chemist() and id = auth.uid());

drop policy if exists "staff read chemist_pings" on public.chemist_pings;
create policy "staff read chemist_pings" on public.chemist_pings
  for select to authenticated using (public.is_staff());

-- Supabase's default privileges grant everything on new public tables to anon
-- and authenticated. RLS already denies writes, but TRUNCATE bypasses RLS, so
-- take the write privileges away too. anon never needs these tables.
revoke all on public.chemists, public.chemist_pings from anon;
revoke insert, update, delete, truncate on public.chemists, public.chemist_pings from authenticated;

-- ---------------------------------------------------------------------------
-- 2. Chemist lockout
-- ---------------------------------------------------------------------------
-- Every public table with RLS enabled (found from pg_class, not a hard-coded
-- list: the live project has tables that are not in this repo), except the two
-- tables above, gets a restrictive policy. Restrictive policies are ANDed with
-- the permissive ones, so staff/admin access is unchanged.
-- Tables created later must add the same policy themselves (or have RLS on
-- with no policies at all).

do $$
declare
  t text;
begin
  for t in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and c.relrowsecurity = true
      and c.relname not in ('chemists', 'chemist_pings')
    order by c.relname
  loop
    execute format('drop policy if exists chemist_blocked on public.%I', t);
    execute format(
      'create policy chemist_blocked on public.%I as restrictive for all to authenticated '
      || 'using (not public.is_chemist()) with check (not public.is_chemist())',
      t
    );
  end loop;

  -- Not covered: public tables with RLS off. Flag them for whoever applies this.
  for t in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p') and c.relrowsecurity = false
    order by c.relname
  loop
    raise warning 'public.% has RLS disabled — chemist_blocked was not added', t;
  end loop;
end $$;

-- storage.objects is owned by supabase_storage_admin; the role running this
-- may not be allowed to change its policies. Never fail the migration on it.
do $$
begin
  drop policy if exists chemist_blocked on storage.objects;
  create policy chemist_blocked on storage.objects as restrictive for all to authenticated
    using (not public.is_chemist()) with check (not public.is_chemist());
exception when insufficient_privilege then
  raise notice 'chemist_blocked NOT created on storage.objects (insufficient privilege) — check its authenticated policies by hand';
end $$;

-- ---------------------------------------------------------------------------
-- 3. Staff edit guard on bookings
-- ---------------------------------------------------------------------------
-- Same function as booking_location_migration.sql, plus:
--   * the five trip columns are admin-only for direct edits, and
--   * the trip RPCs may change anything after
--     perform set_config('app.trip_rpc', 'on', true);
--     (transaction-local; PostgREST clients cannot call set_config themselves,
--     pg_catalog is not an exposed schema).

create or replace function bookings_guard_staff_edits()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if current_setting('app.trip_rpc', true) = 'on' then
    return new;
  end if;

  if auth.role() is distinct from 'authenticated'
     or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' then
    return new;
  end if;

  if new.booking_ref is distinct from old.booking_ref
     or new.source is distinct from old.source
     or new.mode is distinct from old.mode
     or new.name is distinct from old.name
     or new.phone is distinct from old.phone
     or new.dob is distinct from old.dob
     or new.address is distinct from old.address
     or new.branch_name is distinct from old.branch_name
     or new.preferred_date is distinct from old.preferred_date
     or new.tests is distinct from old.tests
     or new.subtotal is distinct from old.subtotal
     or new.home_visit_fee is distinct from old.home_visit_fee
     or new.total is distinct from old.total
     or new.notes is distinct from old.notes
     or new.payment_method is distinct from old.payment_method
     or new.patient_type is distinct from old.patient_type
     or new.card_issuer is distinct from old.card_issuer
     or new.location_lat is distinct from old.location_lat
     or new.location_lng is distinct from old.location_lng
     or new.location_accuracy_m is distinct from old.location_accuracy_m
     or new.location_link is distinct from old.location_link
     or new.assigned_chemist_id is distinct from old.assigned_chemist_id
     or new.track_token is distinct from old.track_token
     or new.trip_status is distinct from old.trip_status
     or new.trip_started_at is distinct from old.trip_started_at
     or new.trip_arrived_at is distinct from old.trip_arrived_at
     or new.created_at is distinct from old.created_at then
    raise exception 'Only an admin account can edit a booking''s details';
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_guard_staff_edits_trigger on bookings;
create trigger bookings_guard_staff_edits_trigger
  before update on bookings
  for each row execute function bookings_guard_staff_edits();

-- ---------------------------------------------------------------------------
-- 4. Retention and realtime
-- ---------------------------------------------------------------------------
-- pg_cron runs in UTC. 01:00 UTC = 03:00 Cairo in winter (EET, UTC+2) and
-- 04:00 during Egypt's summer time (UTC+3) — close enough for a cleanup job.
-- cron.schedule with a job name replaces an existing job of that name.

create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule(
  'chemist_pings_prune',
  '0 1 * * *',
  $$delete from public.chemist_pings where at < now() - interval '30 days'$$
);

-- Realtime (staff live map). Adding a table that is already published errors,
-- so check first. Realtime applies RLS, so chemists/anon get nothing from it.
do $$
declare
  t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    raise warning 'publication supabase_realtime not found — realtime not enabled for chemist_pings/bookings';
    return;
  end if;

  foreach t in array array['chemist_pings', 'bookings']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
