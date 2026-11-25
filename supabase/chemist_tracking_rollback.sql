-- Trust Labs App — ROLLBACK of chemist_tracking_migration.sql (live chemist tracking, Plan 1 web).
--
-- When to run: only if chemist_tracking_migration.sql was applied and has to be
-- taken out again (for example the staff dashboard or a public form broke after
-- it). Run once in the Supabase SQL editor. Safe to re-run: every step checks
-- first (if exists), and the whole script is one transaction, so it either
-- fully applies or changes nothing.
-- بالعربي: شغّل الملف ده بس لو ملف chemist_tracking_migration.sql اتطبّق وعايزين نرجّع الداتابيز زي ما كانت قبله.
--
-- READ BEFORE RUNNING
--   * Data loss, by design: the chemists and chemist_pings tables, the
--     find_trip rate-limit table, and the five trip columns on bookings
--     (assigned chemist, tracking token, trip status/times) are dropped with
--     their data. Tracking links already sent to patients stop working.
--   * Chemist logins: once the chemist_blocked policies are gone, an account
--     with app_metadata.role = 'chemist' is just another "authenticated" user,
--     and the existing staff policies (granted to authenticated) would let it
--     read patient data. Disable or delete every chemist account in
--     Authentication -> Users BEFORE or right after running this. The script
--     raises a warning with the count it finds.
--   * Not undone on purpose:
--       - the pg_cron extension (may have existed before; harmless if idle);
--       - bookings_guard_staff_edits_trigger itself: it existed before the
--         migration with the same definition, only its function changed and
--         is restored below;
--       - generate_patient_cards stays closed to anon (see section 5).
--   * If spam_protection_migration.sql / booking_location_migration.sql were
--     changed after this file was written, re-check sections 4a/4b against them.

begin;

-- ---------------------------------------------------------------------------
-- 0. Warn about chemist accounts that will keep working after the lockout goes
-- ---------------------------------------------------------------------------
do $$
declare
  n int;
begin
  select count(*) into n
  from auth.users u
  where u.raw_app_meta_data ->> 'role' = 'chemist';
  if n > 0 then
    raise warning '% auth user(s) have app_metadata.role = chemist — disable/delete them: without chemist_blocked they get staff-level access', n;
  end if;
exception when insufficient_privilege or undefined_table then
  raise warning 'could not read auth.users — check Authentication -> Users for chemist accounts by hand';
end $$;

-- ---------------------------------------------------------------------------
-- 1. pg_cron jobs (migration section 4 + the trip_lookup_attempts job)
-- ---------------------------------------------------------------------------
do $$
declare
  j text;
begin
  if not exists (select 1 from pg_namespace where nspname = 'cron') then
    return;
  end if;
  foreach j in array array['chemist_pings_prune', 'trip_lookup_attempts_prune']
  loop
    if exists (select 1 from cron.job where jobname = j) then
      perform cron.unschedule(j);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Realtime publication
-- ---------------------------------------------------------------------------
-- A live pre-check showed bookings was NOT in the publication before the
-- migration added it, so both chemist_pings and bookings are removed.
do $$
begin
  if exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'bookings'
  ) then
    alter publication supabase_realtime drop table public.bookings;
  end if;
  if exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chemist_pings'
  ) then
    alter publication supabase_realtime drop table public.chemist_pings;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3. New triggers on bookings
-- ---------------------------------------------------------------------------
drop trigger if exists bookings_cancel_trip_on_cancel on public.bookings;
drop trigger if exists bookings_guard_insert_trip_fields on public.bookings;

-- ---------------------------------------------------------------------------
-- 4. Restore the three pre-existing functions the migration replaced
-- ---------------------------------------------------------------------------
-- Done before the trip columns and the helpers go: the migration's versions
-- reference new.assigned_chemist_id etc. and public.is_staff().

-- 4a. bookings_guard_staff_edits — verbatim from booking_location_migration.sql
create or replace function bookings_guard_staff_edits()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
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
     or new.created_at is distinct from old.created_at then
    raise exception 'Only an admin account can edit a booking''s details';
  end if;

  return new;
end;
$$;

-- 4b. enforce_insert_rate_limit — verbatim from spam_protection_migration.sql
-- (no staff / app.trip_rpc exemption). The five *_rate_limit triggers that use
-- it were never touched by the migration and keep working.
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

-- 4c. generate_patient_cards — body verbatim from
-- patient_cards_family_card_type_migration.sql (no public.is_staff() check,
-- since that helper is dropped below).
create or replace function generate_patient_cards(p_count int, p_type text default 'personal')
returns setof text
language plpgsql security definer set search_path = public as $$
declare
  v_code text;
  v_generated int := 0;
begin
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

-- Grants: deliberately NOT the original "revoke from public" only. Supabase's
-- default privileges also give anon a direct EXECUTE grant, so the original
-- migration left Trust Card code minting open to anyone with the anon key.
-- The chemist migration closed that; rolling back the chemist feature must not
-- re-open it. Staff-only by grant (authenticated), as the original intended.
revoke execute on function public.generate_patient_cards(int, text) from public, anon;
grant execute on function public.generate_patient_cards(int, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. New RPCs, trigger functions and plain helpers
-- ---------------------------------------------------------------------------
drop function if exists public.bookings_cancel_trip_on_cancel();
drop function if exists public.bookings_guard_insert_trip_fields();
drop function if exists public.staff_create_home_booking(text, text, text, text, date, text, text, text);
drop function if exists public.list_available_chemists();
drop function if exists public.assign_chemist(uuid, uuid);
drop function if exists public.chemist_my_visits();
drop function if exists public.chemist_start_trip(uuid);
drop function if exists public.chemist_ping(uuid, double precision, double precision, real);
drop function if exists public.chemist_arrive(uuid);
drop function if exists public.cancel_trip(uuid, boolean);
drop function if exists public.get_trip_by_token(text);
drop function if exists public.find_trip(text, text);
drop function if exists public.normalize_egypt_phone(text);
drop function if exists public.trip_safe_date(text);

-- ---------------------------------------------------------------------------
-- 6. Trip columns on bookings (constraints and index first, explicitly)
-- ---------------------------------------------------------------------------
drop index if exists public.bookings_assigned_chemist_idx;
alter table public.bookings drop constraint if exists bookings_assigned_chemist_id_fkey;
alter table public.bookings drop constraint if exists bookings_track_token_key;
alter table public.bookings drop constraint if exists bookings_trip_status_chk;

alter table public.bookings drop column if exists assigned_chemist_id;
alter table public.bookings drop column if exists track_token;
alter table public.bookings drop column if exists trip_status;
alter table public.bookings drop column if exists trip_started_at;
alter table public.bookings drop column if exists trip_arrived_at;

-- ---------------------------------------------------------------------------
-- 7. New tables (their policies, indexes and sequences go with them)
-- ---------------------------------------------------------------------------
-- chemist_pings before chemists (FK chemist_pings.chemist_id -> chemists.id).
drop table if exists public.trip_lookup_attempts;
drop table if exists public.chemist_pings;
drop table if exists public.chemists;

-- ---------------------------------------------------------------------------
-- 8. chemist_blocked restrictive policies
-- ---------------------------------------------------------------------------
do $$
declare
  t record;
begin
  for t in
    select schemaname, tablename
    from pg_policies
    where policyname = 'chemist_blocked' and schemaname = 'public'
  loop
    execute format('drop policy if exists chemist_blocked on %I.%I', t.schemaname, t.tablename);
  end loop;
end $$;

-- storage.objects is owned by supabase_storage_admin; never fail on it. If
-- this warns, the policy stays and so do is_chemist/app_role (section 9),
-- which is harmless: with no chemist accounts the policy blocks nobody.
do $$
begin
  drop policy if exists chemist_blocked on storage.objects;
exception when insufficient_privilege then
  raise warning 'chemist_blocked NOT dropped on storage.objects (insufficient privilege) — drop it from the dashboard as the storage owner, then re-run this file';
end $$;

-- ---------------------------------------------------------------------------
-- 9. Role helpers — last, and only if nothing still uses them
-- ---------------------------------------------------------------------------
-- A helper is kept (with a warning) if any object still depends on it
-- (pg_depend: policies, views, defaults) or any other function body mentions
-- it (plpgsql bodies are not tracked in pg_depend). Dropping it anyway would
-- either fail the transaction or break that function at run time.
do $$
declare
  h text;
  sig regprocedure;
  users text;
begin
  foreach h in array array['is_chemist', 'is_staff', 'app_role']
  loop
    sig := to_regprocedure('public.' || h || '()');
    if sig is null then
      continue;
    end if;

    select string_agg(x, ', ') into users
    from (
      select pg_describe_object(d.classid, d.objid, d.objsubid) as x
      from pg_depend d
      where d.refclassid = 'pg_proc'::regclass and d.refobjid = sig and d.deptype = 'n'
      union
      -- is_chemist/is_staff call app_role; once dropped above they are no
      -- longer in pg_proc and so do not block it.
      select p.oid::regprocedure::text
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where p.oid <> sig
        and n.nspname not in ('pg_catalog', 'information_schema')
        and p.prosrc ~ ('\m' || h || '\M')
    ) s;

    if users is not null then
      raise warning 'public.%() kept — still used by: %', h, users;
    else
      execute format('drop function %s', sig);
    end if;
  end loop;
end $$;

commit;
