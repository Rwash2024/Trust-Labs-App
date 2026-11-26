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
--   5. RPCs: staff booking + assignment, the chemist trip flow, the public
--      token lookup (find_trip, get_trip_by_token), a cancel trigger, an
--      INSERT guard on the trip columns, and a staff exemption in the
--      shared insert rate limit (enforce_insert_rate_limit).
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
  for select to authenticated using ((select public.is_staff()));

drop policy if exists "chemist reads own row" on public.chemists;
create policy "chemist reads own row" on public.chemists
  for select to authenticated using ((select public.is_chemist()) and id = (select auth.uid()));

drop policy if exists "staff read chemist_pings" on public.chemist_pings;
create policy "staff read chemist_pings" on public.chemist_pings
  for select to authenticated using ((select public.is_staff()));

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
-- The helpers are wrapped in (select ...) so Postgres evaluates them once per
-- statement (an initplan) instead of once per row.

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
      || 'using (not (select public.is_chemist())) with check (not (select public.is_chemist()))',
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
    using (not (select public.is_chemist())) with check (not (select public.is_chemist()));
exception when insufficient_privilege then
  raise warning 'chemist_blocked NOT created on storage.objects (insufficient privilege) — chemists can reach patient-reports/patient-photos; the test script will fail until this is fixed';
end $$;

-- RLS does not reach SECURITY DEFINER functions: they run as their owner.
-- generate_patient_cards (patient_cards_family_card_type_migration.sql, the
-- latest definition) is granted to authenticated with no role check, so a
-- chemist JWT could mint Trust Card codes. Same function, plus a staff check
-- (refuses anon, chemists and any other role). Supabase's default privileges
-- also gave anon a direct EXECUTE grant, which create or replace keeps, so it
-- is revoked from anon explicitly below.
create or replace function generate_patient_cards(p_count int, p_type text default 'personal')
returns setof text
language plpgsql security definer set search_path = public as $$
declare
  v_code text;
  v_generated int := 0;
begin
  if not public.is_staff() then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  if p_type not in ('personal', 'family') then
    raise exception 'p_type must be personal or family';
  end if;

  while v_generated < p_count loop
    v_code := array_to_string(
      array(
        select substr('0123456789abcdefghijklmnopqrstuvwxyz', floor(random() * 36)::int + 1, 1)
        from generate_series(1, 6)
      ),
      ''
    );

    begin
      insert into patient_cards (card_code, card_type) values (v_code, p_type);
      v_generated := v_generated + 1;
      return next v_code;
    exception when unique_violation then
      null;
    end;
  end loop;
end;
$$;

revoke execute on function public.generate_patient_cards(int, text) from public, anon;
grant execute on function public.generate_patient_cards(int, text) to authenticated;

-- Other SECURITY DEFINER functions that a logged-in user (so also a chemist)
-- can call but anon cannot: list them so whoever applies this can check each
-- one for a role check. Functions anon can call are public by design (their
-- arguments are the check, e.g. card_code + phone). Excluded: the helpers and
-- trip RPCs this migration owns, and generate_patient_cards (fixed above).
do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and p.prokind = 'f'
      and p.prorettype <> 'trigger'::regtype
      and has_function_privilege('authenticated', p.oid, 'execute')
      and not has_function_privilege('anon', p.oid, 'execute')
      and p.proname not in (
        'app_role', 'is_chemist', 'is_staff', 'generate_patient_cards',
        'staff_create_home_booking', 'list_available_chemists', 'assign_chemist',
        'chemist_my_visits', 'chemist_start_trip', 'chemist_ping', 'chemist_arrive',
        'cancel_trip', 'get_trip_by_token', 'find_trip'
      )
    order by 1
  loop
    raise warning 'SECURITY DEFINER % is callable by authenticated (incl. chemists) — check it has a role check', f.sig;
  end loop;
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

-- ---------------------------------------------------------------------------
-- 5. RPCs and the cancel trigger
-- ---------------------------------------------------------------------------
-- Every function below is SECURITY DEFINER (runs as its owner, so RLS and the
-- chemist lockout do not apply inside it) with its own role check:
--   staff RPCs   -> public.is_staff(), else 42501
--   chemist RPCs -> public.is_chemist() AND bookings.assigned_chemist_id = auth.uid(), else 42501
-- Error codes the app can tell apart:
--   42501 not allowed, P0002 booking not found, 55000 wrong trip state,
--   22023 bad argument, P0001 + hint 'rate_limited' (find_trip / booking rate limits).
-- Each RPC that writes bookings sets app.trip_rpc = on (transaction-local)
-- right before its UPDATE and switches it off right after. The bypass waives
-- the whole column guard, so each UPDATE names only the trip columns it means
-- to change.
-- Supabase's default privileges grant EXECUTE on new public functions to anon
-- and authenticated directly (not only via PUBLIC), so every function revokes
-- from all three before granting what the plan's table says.
-- "Today" is the Cairo calendar date: (now() at time zone 'Africa/Cairo')::date.

-- Helpers (plain functions, not callable through the API) -------------------

-- Any common way of writing an Egyptian mobile -> 01XXXXXXXXX, else null.
-- Same rules as cleanEgyptPhoneInput + normalizeEgyptPhone in src/lib/phone.js
-- and src/lib/chemistTracking.js: Arabic-Indic / Persian digits, spaces,
-- dashes, +20 / 0020 / 20 prefixes. Unlike the JS input cleaner it does not
-- cut over-long input down to 11 digits, so junk never normalises to a phone.
create or replace function public.normalize_egypt_phone(p text)
returns text
language sql
immutable
set search_path = ''
as $$
  with d as (
    select regexp_replace(
      translate(coalesce(p, ''), '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', '01234567890123456789'),
      '[^0-9]', '', 'g'
    ) as x
  ), s as (
    select case
      when x like '0020%' then substr(x, 5)
      when x like '20%' and length(x) > 11 then substr(x, 3)
      else x
    end as y
    from d
  ), t as (
    select case when y like '1%' and length(y) = 10 then '0' || y else y end as z
    from s
  )
  select case when z ~ '^01[0125][0-9]{8}$' then z end from t
$$;

-- bookings.preferred_date is free TEXT (YYYY-MM-DD from the form's date input,
-- but the chat assistant or old rows may hold anything). Never raises.
create or replace function public.trip_safe_date(p text)
returns date
language plpgsql
stable
set search_path = ''
as $$
begin
  if p is null or p !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    return null;
  end if;
  return p::date;
exception when others then
  return null; -- e.g. 2026-02-31
end;
$$;

revoke execute on function public.normalize_egypt_phone(text) from public, anon, authenticated;
revoke execute on function public.trip_safe_date(text) from public, anon, authenticated;

-- find_trip rate-limit state. RLS on with NO policies and no grants: only
-- find_trip (security definer) reads or writes it. Section 2's lockout loop
-- ran before this table existed; RLS-on-no-policies is already closed to
-- chemists (and to every other API role).
create table if not exists public.trip_lookup_attempts (
  id bigserial primary key,
  phone text not null,
  at timestamptz not null default now()
);
create index if not exists trip_lookup_attempts_phone_at_idx on public.trip_lookup_attempts (phone, at desc);
alter table public.trip_lookup_attempts enable row level security;
revoke all on public.trip_lookup_attempts from anon, authenticated;
revoke all on sequence public.trip_lookup_attempts_id_seq from anon, authenticated;

-- Only the last hour matters; clear the rest nightly (next to the pings job).
select cron.schedule(
  'trip_lookup_attempts_prune',
  '5 1 * * *',
  $$delete from public.trip_lookup_attempts where at < now() - interval '1 day'$$
);

-- bookings_guard_insert_trip_fields ------------------------------------------
-- Anyone can INSERT into bookings ("public insert bookings", with check
-- (true)), and the staff edit guard is BEFORE UPDATE only, so without this an
-- anon insert could arrive already assigned / on the way / with a chosen
-- token, or pretend to be a call-center booking. Staff (and the trip RPC
-- bypass) are exempt; everyone else gets the trip columns blanked and
-- source 'call_center' refused.
create or replace function public.bookings_guard_insert_trip_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_setting('app.trip_rpc', true) = 'on' or public.is_staff() then
    return new;
  end if;

  if new.source = 'call_center' then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  new.assigned_chemist_id := null;
  new.track_token := null;
  new.trip_status := null;
  new.trip_started_at := null;
  new.trip_arrived_at := null;
  return new;
end;
$$;

revoke execute on function public.bookings_guard_insert_trip_fields() from public, anon, authenticated;

drop trigger if exists bookings_guard_insert_trip_fields on public.bookings;
create trigger bookings_guard_insert_trip_fields
  before insert on public.bookings
  for each row execute function public.bookings_guard_insert_trip_fields();

-- enforce_insert_rate_limit: staff exemption ----------------------------------
-- Same function as spam_protection_migration.sql (copied unchanged), plus an
-- early return for staff and for the trip RPC bypass, so a call-center agent
-- booking a 6th visit for one phone in a day is not stopped by the anon limit.
-- The function is shared by every rate-limited table, so staff inserts into
-- complaints / visit_ratings / trust_card_requests / qr_scans are exempt too.
-- If spam_protection_migration.sql is ever re-run, re-run this file after it.
create or replace function public.enforce_insert_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  key_col text := tg_argv[0];
  per_key_max int := tg_argv[1]::int;
  per_key_minutes int := tg_argv[2]::int;
  global_max int := tg_argv[3]::int;
  global_minutes int := tg_argv[4]::int;
  key_val text;
  n int;
begin
  if public.is_staff() or current_setting('app.trip_rpc', true) = 'on' then
    return new;
  end if;

  if key_col <> '' then
    key_val := to_jsonb(new) ->> key_col;
    if key_val is not null and key_val <> '' then
      execute format(
        'select count(*) from %I.%I where %I::text = $1 and created_at > now() - make_interval(mins => $2)',
        tg_table_schema, tg_table_name, key_col
      ) into n using key_val, per_key_minutes;
      if n >= per_key_max then
        raise exception 'تم تجاوز الحد المسموح للإرسال، حاول بعد قليل أو كلّم الخط الساخن 16183'
          using errcode = 'P0001', hint = 'rate_limited';
      end if;
    end if;
  end if;

  execute format(
    'select count(*) from %I.%I where created_at > now() - make_interval(mins => $1)',
    tg_table_schema, tg_table_name
  ) into n using global_minutes;
  if n >= global_max then
    raise exception 'الخدمة مشغولة حاليًا، حاول بعد شوية أو كلّم الخط الساخن 16183'
      using errcode = 'P0001', hint = 'rate_limited_global';
  end if;

  return new;
end;
$$;

-- staff_create_home_booking -------------------------------------------------
-- A call-center agent books a home visit over the phone. The row goes through
-- the same bookings constraints and triggers as a web booking (phone
-- plausibility, length caps, payment_status trigger, ERP forward). It runs as
-- staff, so the insert guard above lets source 'call_center' through and the
-- anon rate limit skips it.
create or replace function public.staff_create_home_booking(
  p_name text,
  p_phone text,
  p_address text,
  p_location_link text,
  p_date date,
  p_tests text,
  p_payment_method text,
  p_notes text
)
returns table (id uuid, booking_ref text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := nullif(btrim(p_name), '');
  v_phone text := public.normalize_egypt_phone(p_phone);
  v_address text := nullif(btrim(p_address), '');
  v_link text := nullif(btrim(p_location_link), '');
  v_tests jsonb;
  v_ref text;
  v_id uuid;
  v_try int := 0;
begin
  if not public.is_staff() then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  if v_name is null then
    raise exception 'name is required' using errcode = '22023';
  end if;
  if v_phone is null or not public.is_plausible_phone(v_phone) then
    raise exception 'invalid Egyptian mobile number' using errcode = '22023';
  end if;
  if v_address is null then
    raise exception 'address is required for a home visit' using errcode = '22023';
  end if;

  -- Free text from the agent ("CBC, Ferritin" or one per line) -> the same
  -- jsonb array of names the booking form stores.
  select coalesce(jsonb_agg(t.item order by t.ord), '[]'::jsonb)
  into v_tests
  from (
    select btrim(x.item) as item, x.ord
    from regexp_split_to_table(coalesce(p_tests, ''), '[\r\n,،]+') with ordinality as x (item, ord)
  ) t
  where t.item <> '';

  -- Form refs are YYYYMMDD + 3 digits; these are YYYYMMDD + 4, so the two
  -- never collide. Retry on the (unlikely) clash with another staff ref.
  loop
    v_try := v_try + 1;
    v_ref := to_char(now() at time zone 'Africa/Cairo', 'YYYYMMDD')
             || lpad(floor(random() * 10000)::int::text, 4, '0');
    begin
      insert into public.bookings as b (
        booking_ref, source, mode, status, name, phone, address, location_link,
        preferred_date, tests, payment_method, notes
      )
      values (
        v_ref, 'call_center', 'home', 'تم التأكيد', v_name, v_phone, v_address, v_link,
        to_char(p_date, 'YYYY-MM-DD'), v_tests, nullif(btrim(p_payment_method), ''),
        nullif(btrim(p_notes), '')
      )
      returning b.id into v_id;
      exit;
    exception when unique_violation then
      if v_try >= 10 then
        raise;
      end if;
    end;
  end loop;

  return query select v_id, v_ref;
end;
$$;

-- list_available_chemists ---------------------------------------------------
create or replace function public.list_available_chemists()
returns table (id uuid, name text, on_trip boolean, today_count int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'Africa/Cairo')::date;
begin
  if not public.is_staff() then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  return query
  select
    c.id,
    c.name,
    exists (
      select 1 from public.bookings b
      where b.assigned_chemist_id = c.id and b.trip_status = 'on_way'
    ),
    (
      select count(*)::int from public.bookings b
      where b.assigned_chemist_id = c.id
        and b.trip_status is distinct from 'cancelled'
        and b.status is distinct from 'ملغي'
        and public.trip_safe_date(b.preferred_date) = v_today
    )
  from public.chemists c
  where c.active
  order by c.name;
end;
$$;

-- assign_chemist ------------------------------------------------------------
-- Assigning (or re-assigning) puts the trip back to 'assigned' and clears the
-- trip times. While the trip is still 'assigned' the tracking token survives
-- a re-assignment, so a link already sent to the patient keeps working.
create or replace function public.assign_chemist(p_booking uuid, p_chemist uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_b public.bookings%rowtype;
  v_token text;
begin
  if not public.is_staff() then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  select * into v_b from public.bookings b where b.id = p_booking for update;
  if not found then
    raise exception 'booking not found' using errcode = 'P0002';
  end if;
  if v_b.mode is distinct from 'home' then
    raise exception 'not a home visit' using errcode = '55000';
  end if;
  if v_b.status = 'ملغي' then
    raise exception 'booking is cancelled' using errcode = '55000';
  end if;
  if v_b.trip_status = 'on_way' then
    raise exception 'the chemist is already on the way' using errcode = '55000';
  end if;
  if not exists (select 1 from public.chemists c where c.id = p_chemist and c.active) then
    raise exception 'chemist not found or inactive' using errcode = '22023';
  end if;

  -- A finished ('arrived') or called-off ('cancelled') trip gets a NEW token,
  -- so links sent for the old trip stay dead.
  v_token := case
    when v_b.track_token is not null and v_b.trip_status is distinct from 'arrived'
         and v_b.trip_status is distinct from 'cancelled'
      then v_b.track_token
    else replace(translate(encode(extensions.gen_random_bytes(24), 'base64'), '+/', '-_'), '=', '')
  end;

  perform set_config('app.trip_rpc', 'on', true);
  update public.bookings b
  set assigned_chemist_id = p_chemist,
      trip_status = 'assigned',
      track_token = v_token,
      trip_started_at = null,
      trip_arrived_at = null
  where b.id = p_booking;
  perform set_config('app.trip_rpc', 'off', true);

  return v_token;
end;
$$;

-- chemist_my_visits ---------------------------------------------------------
-- From yesterday (Cairo) on. Rows whose preferred_date is empty or not a
-- valid YYYY-MM-DD are kept (listed last) rather than hidden: a chemist must
-- never lose an assigned visit because the date was typed oddly.
create or replace function public.chemist_my_visits()
returns table (
  id uuid,
  name text,
  phone text,
  address text,
  location_lat double precision,
  location_lng double precision,
  location_link text,
  tests jsonb,
  notes text,
  preferred_date text,
  trip_status text,
  track_token text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'Africa/Cairo')::date;
begin
  if not public.is_chemist()
     or not exists (select 1 from public.chemists c where c.id = auth.uid() and c.active) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  return query
  select b.id, b.name, b.phone, b.address, b.location_lat, b.location_lng, b.location_link,
         b.tests, b.notes, b.preferred_date, b.trip_status, b.track_token
  from public.bookings b
  where b.assigned_chemist_id = auth.uid()
    and b.trip_status is distinct from 'cancelled'
    and b.status is distinct from 'ملغي'
    and (
      public.trip_safe_date(b.preferred_date) is null
      or public.trip_safe_date(b.preferred_date) >= v_today - 1
    )
  order by public.trip_safe_date(b.preferred_date) nulls last, b.created_at;
end;
$$;

-- chemist_start_trip --------------------------------------------------------
create or replace function public.chemist_start_trip(p_booking uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_b public.bookings%rowtype;
begin
  if not public.is_chemist()
     or not exists (select 1 from public.chemists c where c.id = auth.uid() and c.active) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  -- One start at a time per chemist, so two parallel starts cannot both pass
  -- the "no other trip on the way" check.
  perform pg_advisory_xact_lock(hashtext('chemist_trip:' || auth.uid()::text));

  select * into v_b from public.bookings b where b.id = p_booking for update;
  if not found or v_b.assigned_chemist_id is distinct from auth.uid() then
    raise exception 'not your visit' using errcode = '42501';
  end if;
  if v_b.status = 'ملغي' or v_b.trip_status is distinct from 'assigned' then
    raise exception 'trip cannot start from state %', coalesce(v_b.trip_status, 'none') using errcode = '55000';
  end if;
  if exists (
    select 1 from public.bookings b
    where b.assigned_chemist_id = auth.uid() and b.trip_status = 'on_way' and b.id <> p_booking
  ) then
    raise exception 'another trip is already on the way' using errcode = '55000';
  end if;

  perform set_config('app.trip_rpc', 'on', true);
  update public.bookings b
  set trip_status = 'on_way',
      trip_started_at = now(),
      trip_arrived_at = null
  where b.id = p_booking;
  perform set_config('app.trip_rpc', 'off', true);
end;
$$;

-- chemist_ping --------------------------------------------------------------
-- Writes chemist_pings only (never bookings). A ping less than 10 s after the
-- previous one is dropped silently, so a chatty phone cannot flood the table.
create or replace function public.chemist_ping(p_booking uuid, p_lat double precision, p_lng double precision, p_accuracy real)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_chemist uuid;
  v_trip text;
begin
  if not public.is_chemist()
     or not exists (select 1 from public.chemists c where c.id = auth.uid() and c.active) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  -- NaN fails BETWEEN (Postgres sorts NaN above every number), so it is rejected too.
  if p_lat is null or p_lng is null
     or not (p_lat between -90 and 90) or not (p_lng between -180 and 180) then
    raise exception 'invalid coordinates' using errcode = '22023';
  end if;

  -- Row lock: serialises pings with each other and with arrive/cancel, so the
  -- on_way check and the 10 s throttle below hold under concurrency.
  select b.assigned_chemist_id, b.trip_status into v_chemist, v_trip
  from public.bookings b where b.id = p_booking
  for update;
  if not found or v_chemist is distinct from auth.uid() then
    raise exception 'not your visit' using errcode = '42501';
  end if;
  if v_trip is distinct from 'on_way' then
    raise exception 'trip is not on the way' using errcode = '55000';
  end if;

  if exists (
    select 1 from public.chemist_pings cp
    where cp.booking_id = p_booking and cp.at > now() - interval '10 seconds'
  ) then
    return;
  end if;

  insert into public.chemist_pings (booking_id, chemist_id, lat, lng, accuracy_m)
  values (
    p_booking, v_chemist, p_lat, p_lng,
    case when p_accuracy >= 0 and p_accuracy <= 100000 then p_accuracy end
  );
end;
$$;

-- chemist_arrive ------------------------------------------------------------
create or replace function public.chemist_arrive(p_booking uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_b public.bookings%rowtype;
begin
  if not public.is_chemist()
     or not exists (select 1 from public.chemists c where c.id = auth.uid() and c.active) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  select * into v_b from public.bookings b where b.id = p_booking for update;
  if not found or v_b.assigned_chemist_id is distinct from auth.uid() then
    raise exception 'not your visit' using errcode = '42501';
  end if;
  if v_b.trip_status is distinct from 'on_way' then
    raise exception 'trip is not on the way' using errcode = '55000';
  end if;

  perform set_config('app.trip_rpc', 'on', true);
  update public.bookings b
  set trip_status = 'arrived',
      trip_arrived_at = now()
  where b.id = p_booking;
  perform set_config('app.trip_rpc', 'off', true);
end;
$$;

-- cancel_trip ---------------------------------------------------------------
-- Chemist (owner): undo, always back to 'assigned' (p_final is ignored).
-- Staff: back to 'assigned', or with p_final = true to 'cancelled' (the visit
-- drops off the chemist's list and the tracking link stops working).
-- Neither touches bookings.status; cancelling the booking itself is a status
-- change, handled by the trigger below.
create or replace function public.cancel_trip(p_booking uuid, p_final boolean default false)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_b public.bookings%rowtype;
  v_new text;
begin
  if public.is_chemist() then
    if not exists (select 1 from public.chemists c where c.id = auth.uid() and c.active) then
      raise exception 'not allowed' using errcode = '42501';
    end if;
    select * into v_b from public.bookings b where b.id = p_booking for update;
    if not found or v_b.assigned_chemist_id is distinct from auth.uid() then
      raise exception 'not your visit' using errcode = '42501';
    end if;
    if v_b.trip_status is null or v_b.trip_status = 'cancelled' or v_b.status = 'ملغي' then
      raise exception 'trip cannot be undone from state %', coalesce(v_b.trip_status, 'none') using errcode = '55000';
    end if;
    v_new := 'assigned';
  elsif public.is_staff() then
    select * into v_b from public.bookings b where b.id = p_booking for update;
    if not found then
      raise exception 'booking not found' using errcode = 'P0002';
    end if;
    if v_b.assigned_chemist_id is null or v_b.trip_status is null then
      raise exception 'booking has no trip' using errcode = '55000';
    end if;
    v_new := case when coalesce(p_final, false) then 'cancelled' else 'assigned' end;
  else
    raise exception 'not allowed' using errcode = '42501';
  end if;

  perform set_config('app.trip_rpc', 'on', true);
  update public.bookings b
  set trip_status = v_new,
      trip_started_at = null,
      trip_arrived_at = null
  where b.id = p_booking;
  perform set_config('app.trip_rpc', 'off', true);
end;
$$;

-- get_trip_by_token ---------------------------------------------------------
-- The public tracking page (/t/<token>). Returns only what the patient needs:
-- never the patient's phone, address or tests, and never the chemist's phone
-- or full name. null for an unknown token, a cancelled booking or trip, or
-- more than 24 h after arrival. "last" (the newest ping) only while on the way.
create or replace function public.get_trip_by_token(p_token text)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_b public.bookings%rowtype;
  v_first text;
  v_last json;
begin
  if p_token is null or length(p_token) <> 32 then
    return null;
  end if;

  select * into v_b from public.bookings b where b.track_token = p_token;
  if not found
     or v_b.status = 'ملغي'
     or v_b.trip_status is null
     or v_b.trip_status = 'cancelled'
     or (v_b.trip_status = 'arrived' and v_b.trip_arrived_at < now() - interval '24 hours') then
    return null;
  end if;

  select nullif((regexp_split_to_array(btrim(c.name), '\s+'))[1], '')
  into v_first
  from public.chemists c
  where c.id = v_b.assigned_chemist_id;

  if v_b.trip_status = 'on_way' then
    select json_build_object('lat', cp.lat, 'lng', cp.lng, 'at', cp.at)
    into v_last
    from public.chemist_pings cp
    where cp.booking_id = v_b.id
    order by cp.at desc, cp.id desc
    limit 1;
  end if;

  return json_build_object(
    'status', v_b.trip_status,
    'chemist_first_name', v_first,
    'started_at', v_b.trip_started_at,
    'arrived_at', v_b.trip_arrived_at,
    'preferred_date', v_b.preferred_date,
    'dest', case
      when v_b.location_lat is not null and v_b.location_lng is not null
        then json_build_object('lat', v_b.location_lat, 'lng', v_b.location_lng)
    end,
    'last', v_last
  );
end;
$$;

-- find_trip -----------------------------------------------------------------
-- "Track my chemist" form: phone + booking number -> token (or null). The
-- token is returned only once a chemist is assigned. 10 lookups per phone per
-- hour; the 11th raises (P0001, hint rate_limited) until the hour rolls over.
-- The stored phone goes through the same normalisation, so a booking saved as
-- 01…, +20… or with spaces still matches.
create or replace function public.find_trip(p_phone text, p_booking_ref text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone text := public.normalize_egypt_phone(p_phone);
  v_ref text := btrim(translate(coalesce(p_booking_ref, ''), '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', '01234567890123456789'));
  v_n int;
  v_token text;
begin
  if v_phone is null or v_ref = '' or length(v_ref) > 40 then
    return null;
  end if;

  perform pg_advisory_xact_lock(hashtext('find_trip:' || v_phone));

  select count(*) into v_n
  from public.trip_lookup_attempts a
  where a.phone = v_phone and a.at > now() - interval '1 hour';
  if v_n >= 10 then
    raise exception 'محاولات كتير، جرّب تاني بعد ساعة أو كلّم الخط الساخن 16183'
      using errcode = 'P0001', hint = 'rate_limited';
  end if;

  insert into public.trip_lookup_attempts (phone) values (v_phone);

  select b.track_token into v_token
  from public.bookings b
  where b.booking_ref = v_ref
    and b.mode = 'home'
    and b.assigned_chemist_id is not null
    and public.normalize_egypt_phone(b.phone) = v_phone;

  return v_token;
end;
$$;

-- Grants ----------------------------------------------------------------------
revoke execute on function public.staff_create_home_booking(text, text, text, text, date, text, text, text) from public, anon, authenticated;
revoke execute on function public.list_available_chemists() from public, anon, authenticated;
revoke execute on function public.assign_chemist(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.chemist_my_visits() from public, anon, authenticated;
revoke execute on function public.chemist_start_trip(uuid) from public, anon, authenticated;
revoke execute on function public.chemist_ping(uuid, double precision, double precision, real) from public, anon, authenticated;
revoke execute on function public.chemist_arrive(uuid) from public, anon, authenticated;
revoke execute on function public.cancel_trip(uuid, boolean) from public, anon, authenticated;
revoke execute on function public.get_trip_by_token(text) from public, anon, authenticated;
revoke execute on function public.find_trip(text, text) from public, anon, authenticated;

grant execute on function public.staff_create_home_booking(text, text, text, text, date, text, text, text) to authenticated;
grant execute on function public.list_available_chemists() to authenticated;
grant execute on function public.assign_chemist(uuid, uuid) to authenticated;
grant execute on function public.chemist_my_visits() to authenticated;
grant execute on function public.chemist_start_trip(uuid) to authenticated;
grant execute on function public.chemist_ping(uuid, double precision, double precision, real) to authenticated;
grant execute on function public.chemist_arrive(uuid) to authenticated;
grant execute on function public.cancel_trip(uuid, boolean) to authenticated;
grant execute on function public.get_trip_by_token(text) to anon, authenticated;
-- authenticated too: a staff member logged in on the same browser sends their
-- JWT from the public "track my chemist" form. find_trip returns only a token.
grant execute on function public.find_trip(text, text) to anon, authenticated;

-- bookings_cancel_trip_on_cancel --------------------------------------------
-- Booking status -> 'ملغي' (by staff or admin) also ends the trip. AFTER, not
-- BEFORE: triggers of the same timing fire in name order, so a BEFORE trigger
-- with this name would run before bookings_guard_staff_edits_trigger, and the
-- guard would then reject the staff status change because trip_status moved.
-- Here trip_status is changed by a separate UPDATE under the RPC bypass (that
-- UPDATE does not touch status, so this trigger does not fire again); the
-- previous app.trip_rpc value is restored afterwards.
create or replace function public.bookings_cancel_trip_on_cancel()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prev text := current_setting('app.trip_rpc', true);
begin
  perform set_config('app.trip_rpc', 'on', true);
  update public.bookings b
  set trip_status = 'cancelled'
  where b.id = new.id;
  perform set_config('app.trip_rpc', coalesce(v_prev, ''), true);
  return null;
end;
$$;

revoke execute on function public.bookings_cancel_trip_on_cancel() from public, anon, authenticated;

drop trigger if exists bookings_cancel_trip_on_cancel on public.bookings;
create trigger bookings_cancel_trip_on_cancel
  after update of status on public.bookings
  for each row
  when (
    new.status = 'ملغي'
    and old.status is distinct from 'ملغي'
    and new.trip_status is not null
    and new.trip_status <> 'cancelled'
  )
  execute function public.bookings_cancel_trip_on_cancel();
