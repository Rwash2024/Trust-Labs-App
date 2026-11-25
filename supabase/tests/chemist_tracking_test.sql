-- Tests for chemist_tracking_migration.sql.
--
-- How to run: AFTER the migration has been applied, paste this whole file into
-- the Supabase SQL editor (or send it through MCP execute_sql) as the
-- postgres role. Everything runs inside BEGIN ... ROLLBACK, so the fixture
-- rows (auth users, chemists, a booking, a ping) never persist. Any failed
-- check raises an exception and stops the script; reaching the final
-- "chemist_tracking tests: all passed" notice means every check passed.
--
-- Impersonation: set local role authenticated / anon plus
-- set local request.jwt.claims, which is what auth.jwt(), auth.uid() and
-- auth.role() read. "reset role" returns to postgres between sections.
--
-- Fixture ids (fixed so failures are easy to trace):
--   chemist A  c4e0a000-0000-4000-8000-00000000000a
--   chemist B  c4e0a000-0000-4000-8000-00000000000b
--   staff      c4e0a000-0000-4000-8000-0000000000ff (claims only, no auth row)
--   booking    booking_ref 'TEST-CHEM-0001'

begin;

-- ---------------------------------------------------------------------------
-- Fixtures (as postgres)
-- ---------------------------------------------------------------------------

insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('c4e0a000-0000-4000-8000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'test-chemist-a@chemist.invalid', '{"role":"chemist"}', '{}', now(), now()),
  ('c4e0a000-0000-4000-8000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'test-chemist-b@chemist.invalid', '{"role":"chemist"}', '{}', now(), now());

insert into public.chemists (id, name, phone)
values
  ('c4e0a000-0000-4000-8000-00000000000a', 'كيميائي اختبار أ', '01098347262'),
  ('c4e0a000-0000-4000-8000-00000000000b', 'كيميائي اختبار ب', '01098347263');

insert into public.bookings (booking_ref, mode, name, phone, address)
values ('TEST-CHEM-0001', 'home', 'مريض اختبار', '01098347261', 'عنوان اختبار');

insert into public.chemist_pings (booking_id, chemist_id, lat, lng, accuracy_m)
select id, 'c4e0a000-0000-4000-8000-00000000000a', 30.0444, 31.2357, 12
from public.bookings where booking_ref = 'TEST-CHEM-0001';

-- Structural checks + row counts as postgres (stored in transaction-local
-- settings so the impersonated sections can compare against them).
do $$
declare
  t text;
  n bigint;
begin
  -- Every public table with RLS on (except the two new ones) has the lockout,
  -- or has no policies at all (RLS on + no policy = closed to every API role,
  -- e.g. tables later sections create for RPC-only use).
  for t in
    select c.relname
    from pg_class c join pg_namespace ns on ns.oid = c.relnamespace
    where ns.nspname = 'public' and c.relkind in ('r', 'p') and c.relrowsecurity
      and c.relname not in ('chemists', 'chemist_pings')
      and exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname)
  loop
    assert exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = t and policyname = 'chemist_blocked'
        and permissive = 'RESTRICTIVE' and cmd = 'ALL' and roles = '{authenticated}'
        and qual ilike '%not%select%is_chemist()%' and with_check ilike '%not%select%is_chemist()%'
    ), format('public.%s is missing the restrictive chemist_blocked policy', t);
  end loop;

  foreach t in array array['bookings', 'sample_tracking', 'complaints', 'patient_cards', 'trust_card_requests', 'visit_ratings']
  loop
    execute format('select count(*) from public.%I', t) into n;
    perform set_config('chemtest.n_' || t, n::text, true);
    if n = 0 then
      raise notice 'public.% is empty here, so "chemist sees 0 rows" is only checked via the policy', t;
    end if;
  end loop;

  assert current_setting('chemtest.n_bookings')::bigint >= 1, 'fixture booking missing';

  -- Storage holds patient reports and photos, so the lockout there is required,
  -- not optional: fail if the migration's storage block hit insufficient_privilege.
  assert exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'chemist_blocked'
      and permissive = 'RESTRICTIVE' and cmd = 'ALL' and roles = '{authenticated}'
      and qual ilike '%not%select%is_chemist()%' and with_check ilike '%not%select%is_chemist()%'
  ), 'storage.objects is missing the restrictive chemist_blocked policy';
end $$;

-- ---------------------------------------------------------------------------
-- Storage fixture (as staff: the "staff manage patient reports" policy lets
-- authenticated write to patient-reports, and this does not depend on whether
-- postgres bypasses RLS on storage.objects)
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub":"c4e0a000-0000-4000-8000-0000000000ff","role":"authenticated","app_metadata":{}}';

insert into storage.objects (bucket_id, name)
values ('patient-reports', 'chemtest/TEST-CHEM-0001.pdf');

-- Checked as staff too (postgres may not bypass RLS on storage.objects): a
-- non-empty bucket makes the chemist's "0 rows" below meaningful.
do $$
begin
  assert (select count(*) from storage.objects where bucket_id = 'patient-reports') >= 1,
    'storage fixture in patient-reports missing';
end $$;

reset role;

-- ---------------------------------------------------------------------------
-- Chemist A
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub":"c4e0a000-0000-4000-8000-00000000000a","role":"authenticated","app_metadata":{"role":"chemist"}}';

do $$
declare
  t text;
  n bigint;
begin
  assert public.is_chemist(), 'is_chemist() should be true for a chemist claim';
  assert not public.is_staff(), 'is_staff() should be false for a chemist claim';

  foreach t in array array['bookings', 'sample_tracking', 'complaints', 'patient_cards', 'trust_card_requests', 'visit_ratings']
  loop
    execute format('select count(*) from public.%I', t) into n;
    assert n = 0, format('chemist sees %s rows in public.%s (expected 0)', n, t);
  end loop;

  -- Own chemists row only.
  assert (select count(*) from public.chemists) = 1, 'chemist should see exactly one chemists row';
  assert (select id from public.chemists) = 'c4e0a000-0000-4000-8000-00000000000a'::uuid,
    'chemist sees a chemists row that is not their own';

  -- Storage: nothing in the patient buckets, no uploads.
  assert (select count(*) from storage.objects where bucket_id = 'patient-reports') = 0,
    'chemist can see patient-reports objects';
  assert (select count(*) from storage.objects where bucket_id = 'patient-photos') = 0,
    'chemist can see patient-photos objects';

  begin
    insert into storage.objects (bucket_id, name)
    values ('patient-reports', 'chemtest/by-chemist.pdf');
    raise exception 'TEST FAILED: chemist inserted into storage.objects';
  exception when insufficient_privilege then
    null; -- expected: row-level security violation (42501)
  end;

  -- SECURITY DEFINER RPC granted to authenticated must refuse a chemist.
  begin
    perform public.generate_patient_cards(1, 'personal');
    raise exception 'TEST FAILED: chemist generated patient cards';
  exception when insufficient_privilege then
    null; -- expected: 'not allowed' (42501)
  end;

  -- No direct access to pings.
  assert (select count(*) from public.chemist_pings) = 0, 'chemist should not read chemist_pings directly';

  -- No direct writes: the public booking insert policy must not let a chemist in.
  begin
    insert into public.bookings (booking_ref, mode, name, phone, address)
    values ('TEST-CHEM-0002', 'home', 'x', '01098347264', 'x');
    raise exception 'TEST FAILED: chemist inserted into bookings';
  exception when insufficient_privilege then
    null; -- expected: new row violates row-level security policy (42501)
  end;

  begin
    -- the INSERT privilege check fires before the row (or its FK) is looked at
    insert into public.chemist_pings (booking_id, chemist_id, lat, lng)
    values (gen_random_uuid(), 'c4e0a000-0000-4000-8000-00000000000a', 30, 31);
    raise exception 'TEST FAILED: chemist inserted into chemist_pings';
  exception when insufficient_privilege then
    null; -- expected: INSERT privilege revoked
  end;
end $$;

reset role;

-- ---------------------------------------------------------------------------
-- Staff (logged in, no app_metadata.role)
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub":"c4e0a000-0000-4000-8000-0000000000ff","role":"authenticated","app_metadata":{}}';

do $$
begin
  assert public.is_staff(), 'is_staff() should be true for a staff claim';
  assert not public.is_chemist(), 'is_chemist() should be false for a staff claim';

  assert (select count(*) from public.bookings) >= 1, 'staff should still see bookings';
  assert exists (select 1 from public.bookings where booking_ref = 'TEST-CHEM-0001'), 'staff cannot see the fixture booking';

  assert (select count(*) from public.chemists) >= 2, 'staff should see all chemists';
  assert (select count(*) from public.chemist_pings) >= 1, 'staff should see chemist_pings';

  -- Guard: staff may not assign a chemist (or touch any trip column) directly.
  begin
    update public.bookings set assigned_chemist_id = 'c4e0a000-0000-4000-8000-00000000000a'
    where booking_ref = 'TEST-CHEM-0001';
    raise exception 'TEST FAILED: staff set assigned_chemist_id directly';
  exception when others then
    if sqlerrm not like 'Only an admin account can edit%' then
      raise;
    end if;
  end;

  begin
    update public.bookings set trip_status = 'on_way' where booking_ref = 'TEST-CHEM-0001';
    raise exception 'TEST FAILED: staff set trip_status directly';
  exception when others then
    if sqlerrm not like 'Only an admin account can edit%' then
      raise;
    end if;
  end;

  -- Existing behaviour kept: staff can still move the status.
  update public.bookings set status = 'تم التأكيد' where booking_ref = 'TEST-CHEM-0001';
  assert (select status from public.bookings where booking_ref = 'TEST-CHEM-0001') = 'تم التأكيد',
    'staff could not update booking status';

  -- RPC bypass: with app.trip_rpc = on (what the trip RPCs set) the guard lets it through.
  perform set_config('app.trip_rpc', 'on', true);
  update public.bookings set assigned_chemist_id = 'c4e0a000-0000-4000-8000-00000000000a', trip_status = 'assigned'
  where booking_ref = 'TEST-CHEM-0001';
  perform set_config('app.trip_rpc', 'off', true);
  assert (select trip_status from public.bookings where booking_ref = 'TEST-CHEM-0001') = 'assigned',
    'guard bypass via app.trip_rpc did not work';

  -- With the bypass switched off again the guard is back.
  begin
    update public.bookings set trip_status = 'on_way' where booking_ref = 'TEST-CHEM-0001';
    raise exception 'TEST FAILED: guard stayed open after app.trip_rpc = off';
  exception when others then
    if sqlerrm not like 'Only an admin account can edit%' then
      raise;
    end if;
  end;

  -- Staff cannot write the new tables directly.
  begin
    insert into public.chemists (id, name, phone)
    values ('c4e0a000-0000-4000-8000-0000000000ff', 'x', '01098347265');
    raise exception 'TEST FAILED: staff inserted into chemists';
  exception when insufficient_privilege then
    null;
  end;
end $$;

reset role;

-- ---------------------------------------------------------------------------
-- Anon
-- ---------------------------------------------------------------------------

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

do $$
begin
  begin
    perform count(*) from public.chemists;
    raise exception 'TEST FAILED: anon can select chemists';
  exception when insufficient_privilege then
    null;
  end;
  begin
    perform count(*) from public.chemist_pings;
    raise exception 'TEST FAILED: anon can select chemist_pings';
  exception when insufficient_privilege then
    null;
  end;
end $$;

reset role;

-- ---------------------------------------------------------------------------
-- Retention + realtime (as postgres)
-- ---------------------------------------------------------------------------

do $$
begin
  assert exists (
    select 1 from cron.job
    where jobname = 'chemist_pings_prune' and schedule = '0 1 * * *'
      and command ilike '%delete from public.chemist_pings%30 days%'
  ), 'cron job chemist_pings_prune missing or wrong';

  assert exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chemist_pings'),
    'chemist_pings not in supabase_realtime';
  assert exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'bookings'),
    'bookings not in supabase_realtime';
end $$;

-- ===========================================================================
-- Section 5: RPCs and the cancel trigger
-- ===========================================================================
-- Bookings used below (all rolled back):
--   b1  TEST-CHEM-0001 (fixture above), phone 01098347261, no map pin, date = today
--   b2  TEST-CHEM-0003, phone 01098347266, with a map pin, preferred_date not a date
--   b3  created by staff_create_home_booking, phone 01098347267
-- Ids and tokens are handed between the impersonated blocks through
-- transaction-local settings (chemtest.*).
-- Everything here runs in one transaction, so now() never moves: the 10 s
-- ping throttle and the 24 h cut-off are tested by moving timestamps back.

-- Setup (as postgres) -------------------------------------------------------

do $$
declare
  v_b1 uuid;
  v_b2 uuid;
begin
  assert public.normalize_egypt_phone('+20 109 834-7261') = '01098347261', 'normalise +20 with spaces/dashes';
  assert public.normalize_egypt_phone('0020 1098347261') = '01098347261', 'normalise 0020';
  assert public.normalize_egypt_phone('201098347261') = '01098347261', 'normalise 20 without +';
  assert public.normalize_egypt_phone('1098347261') = '01098347261', 'normalise missing leading 0';
  assert public.normalize_egypt_phone('٠١٠٩٨٣٤٧٢٦١') = '01098347261', 'normalise Arabic-Indic digits';
  assert public.normalize_egypt_phone('010983472619') is null, 'over-long input must not normalise';
  assert public.normalize_egypt_phone('01398347261') is null, '013 is not a mobile prefix';
  assert public.trip_safe_date('2026-02-31') is null, 'invalid date must give null, not raise';
  assert public.trip_safe_date('31/12/2026') is null, 'non-ISO text must give null';
  assert public.trip_safe_date('2026-12-31') = date '2026-12-31', 'ISO date parses';

  -- Start b1 from a clean trip state (Task 2's guard test left it assigned).
  perform set_config('app.trip_rpc', 'on', true);
  update public.bookings
  set assigned_chemist_id = null, trip_status = null, track_token = null,
      trip_started_at = null, trip_arrived_at = null,
      preferred_date = to_char((now() at time zone 'Africa/Cairo')::date, 'YYYY-MM-DD')
  where booking_ref = 'TEST-CHEM-0001'
  returning id into v_b1;
  perform set_config('app.trip_rpc', 'off', true);

  -- The fixture ping is stamped now(); move it back so the 10 s throttle does
  -- not swallow the first real ping below.
  update public.chemist_pings set at = now() - interval '1 hour' where booking_id = v_b1;

  insert into public.bookings (booking_ref, mode, name, phone, address, location_lat, location_lng, preferred_date)
  values ('TEST-CHEM-0003', 'home', 'مريض اختبار ٢', '01098347266', 'عنوان اختبار ٢', 30.0131, 31.2089, '31/12/2026')
  returning id into v_b2;

  perform set_config('chemtest.b1', v_b1::text, true);
  perform set_config('chemtest.b2', v_b2::text, true);
end $$;

-- Anon: before assignment ---------------------------------------------------

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

do $$
begin
  assert public.find_trip('+201098347261', 'TEST-CHEM-0001') is null, 'find_trip must return null before a chemist is assigned';
  assert public.get_trip_by_token('no-such-token-no-such-token-0000') is null, 'unknown token must give null';
  assert public.get_trip_by_token(null) is null, 'null token must give null';

  begin
    perform public.staff_create_home_booking('x', '01098347268', 'x', null, current_date, null, null, null);
    raise exception 'TEST FAILED: anon called staff_create_home_booking';
  exception when insufficient_privilege then
    null; -- expected: no EXECUTE for anon
  end;
  begin
    perform public.chemist_my_visits();
    raise exception 'TEST FAILED: anon called chemist_my_visits';
  exception when insufficient_privilege then
    null;
  end;
end $$;

reset role;

-- Chemist A: staff RPCs are refused -----------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub":"c4e0a000-0000-4000-8000-00000000000a","role":"authenticated","app_metadata":{"role":"chemist"}}';

do $$
begin
  begin
    perform public.staff_create_home_booking('x', '01098347268', 'x', null, current_date, null, null, null);
    raise exception 'TEST FAILED: chemist called staff_create_home_booking';
  exception when insufficient_privilege then
    null; -- expected: not allowed (42501)
  end;
  begin
    perform public.list_available_chemists();
    raise exception 'TEST FAILED: chemist called list_available_chemists';
  exception when insufficient_privilege then
    null;
  end;
  begin
    perform public.assign_chemist(current_setting('chemtest.b1')::uuid, 'c4e0a000-0000-4000-8000-00000000000a');
    raise exception 'TEST FAILED: chemist called assign_chemist';
  exception when insufficient_privilege then
    null;
  end;
  -- find_trip is open to authenticated too (a logged-in browser on the public
  -- form); it returns only a token, and none exists before assignment.
  assert public.find_trip('01098347261', 'TEST-CHEM-0001') is null,
    'find_trip as authenticated should work and return null before assignment';
end $$;

reset role;

-- Staff: create, list, assign -----------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub":"c4e0a000-0000-4000-8000-0000000000ff","role":"authenticated","app_metadata":{}}';

do $$
declare
  r record;
  v_today text := to_char((now() at time zone 'Africa/Cairo')::date, 'YYYY-MM-DD');
  v_t1 text;
  v_t2 text;
  v_t3 text;
  i int;
begin
  -- Call-center booking.
  select * into r
  from public.staff_create_home_booking(
    '  مريض تليفون  ', '+20 10 9834 7267', 'عنوان تليفون', null,
    (now() at time zone 'Africa/Cairo')::date, E'CBC، Ferritin\nTSH', 'كاش', '  '
  );
  assert r.id is not null, 'staff_create_home_booking returned no id';
  assert r.booking_ref ~ '^[0-9]{12}$', format('booking_ref %s is not YYYYMMDD + 4 digits', r.booking_ref);
  assert left(r.booking_ref, 8) = to_char(now() at time zone 'Africa/Cairo', 'YYYYMMDD'), 'booking_ref does not start with the Cairo date';
  assert exists (
    select 1 from public.bookings b
    where b.id = r.id and b.booking_ref = r.booking_ref
      and b.mode = 'home' and b.source = 'call_center' and b.status = 'تم التأكيد'
      and b.name = 'مريض تليفون' and b.phone = '01098347267' and b.address = 'عنوان تليفون'
      and b.preferred_date = v_today and b.tests = '["CBC", "Ferritin", "TSH"]'::jsonb
      and b.payment_method = 'كاش' and b.notes is null
      and b.assigned_chemist_id is null and b.trip_status is null
  ), 'staff-created booking has the wrong shape';
  perform set_config('chemtest.b3', r.id::text, true);

  -- Staff are exempt from the anon limit (5 bookings per phone per day):
  -- five more for the same phone make six, and all go through.
  for i in 1..5 loop
    perform public.staff_create_home_booking(
      'مريض تليفون', '01098347267', 'عنوان تليفون', null, null, null, null, null
    );
  end loop;
  assert (select count(*) from public.bookings b where b.phone = '01098347267' and b.source = 'call_center') = 6,
    'staff should not be stopped by the per-phone booking rate limit';

  begin
    perform public.staff_create_home_booking('x', '01012345678', 'x', null, null, null, null, null);
    raise exception 'TEST FAILED: placeholder phone accepted';
  exception when invalid_parameter_value then
    null; -- expected: is_plausible_phone rejects 01012345678
  end;
  begin
    perform public.staff_create_home_booking('x', '01098347268', '   ', null, null, null, null, null);
    raise exception 'TEST FAILED: home booking without address accepted';
  exception when invalid_parameter_value then
    null;
  end;

  -- Chemist list: both fixtures, nobody on a trip, nothing today yet.
  assert (select count(*) from public.list_available_chemists() c
          where c.id in ('c4e0a000-0000-4000-8000-00000000000a', 'c4e0a000-0000-4000-8000-00000000000b')
            and not c.on_trip and c.today_count = 0) = 2,
    'list_available_chemists: fixtures missing, on a trip, or with visits already';

  -- Assign b1 and b2 to chemist A.
  v_t1 := public.assign_chemist(current_setting('chemtest.b1')::uuid, 'c4e0a000-0000-4000-8000-00000000000a');
  assert v_t1 ~ '^[A-Za-z0-9_-]{32}$', format('token %s is not 32 url-safe chars', v_t1);
  assert public.assign_chemist(current_setting('chemtest.b1')::uuid, 'c4e0a000-0000-4000-8000-00000000000a') = v_t1,
    're-assigning must keep the existing token';
  assert (select trip_status from public.bookings where id = current_setting('chemtest.b1')::uuid) = 'assigned',
    'assign_chemist did not set trip_status = assigned';

  v_t2 := public.assign_chemist(current_setting('chemtest.b2')::uuid, 'c4e0a000-0000-4000-8000-00000000000a');
  assert v_t2 <> v_t1, 'two bookings got the same token';

  -- b3 goes to chemist B (used for the 24 h test).
  v_t3 := public.assign_chemist(current_setting('chemtest.b3')::uuid, 'c4e0a000-0000-4000-8000-00000000000b');

  -- today_count: b1 is today; b2's date is not a date (counted nowhere, no crash).
  assert (select c.today_count from public.list_available_chemists() c
          where c.id = 'c4e0a000-0000-4000-8000-00000000000a') = 1,
    'today_count for chemist A should be 1';

  begin
    perform public.assign_chemist(current_setting('chemtest.b1')::uuid, gen_random_uuid());
    raise exception 'TEST FAILED: assigned an unknown chemist';
  exception when invalid_parameter_value then
    null;
  end;

  perform set_config('chemtest.t1', v_t1, true);
  perform set_config('chemtest.t2', v_t2, true);
  perform set_config('chemtest.t3', v_t3, true);
end $$;

reset role;

-- Anon: after assignment ----------------------------------------------------

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

do $$
declare
  j jsonb;
  v_ok boolean;
  i int;
begin
  assert public.find_trip('+201098347261', 'TEST-CHEM-0001') = current_setting('chemtest.t1'),
    'find_trip(+20…) must return the token after assignment';
  assert public.find_trip('0020 109 834 7261', ' TEST-CHEM-0001 ') = current_setting('chemtest.t1'),
    'find_trip(0020 … with spaces) must return the token';
  assert public.find_trip('01098347262', 'TEST-CHEM-0001') is null, 'find_trip with the wrong phone must return null';
  assert public.find_trip('01098347261', 'TEST-CHEM-0003') is null, 'find_trip with another booking''s ref must return null';

  -- assigned, no pin: no last, no dest.
  j := public.get_trip_by_token(current_setting('chemtest.t1'))::jsonb;
  assert j is not null, 'get_trip_by_token returned null for an assigned trip';
  assert j ->> 'status' = 'assigned', 'status should be assigned';
  assert j -> 'last' = 'null'::jsonb, 'last must be null before the trip starts';
  assert j -> 'dest' = 'null'::jsonb, 'dest must be null when the booking has no pin';
  assert j ->> 'chemist_first_name' = 'كيميائي', format('chemist_first_name is %s', j ->> 'chemist_first_name');
  assert j ->> 'preferred_date' = to_char((now() at time zone 'Africa/Cairo')::date, 'YYYY-MM-DD'), 'preferred_date missing';
  assert j::text !~ '"(phone|address|tests|name)"', format('get_trip_by_token leaks patient/chemist data: %s', j);

  -- b2 has a pin.
  j := public.get_trip_by_token(current_setting('chemtest.t2'))::jsonb;
  assert (j -> 'dest' ->> 'lat')::float8 = 30.0131 and (j -> 'dest' ->> 'lng')::float8 = 31.2089,
    'dest should carry the booking pin';

  -- Rate limit: 10 lookups per phone per hour, the 11th raises.
  for i in 1..10 loop
    assert public.find_trip('01098347269', 'NO-SUCH-REF') is null, 'unknown ref must return null';
  end loop;
  v_ok := false;
  begin
    perform public.find_trip('+20 1098347269', 'NO-SUCH-REF');
  exception when raise_exception then
    v_ok := sqlerrm like 'محاولات كتير%';
  end;
  assert v_ok, 'find_trip: the 11th lookup in an hour for one phone must be rate-limited';
end $$;

reset role;

-- Chemist B: someone else's visit -------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub":"c4e0a000-0000-4000-8000-00000000000b","role":"authenticated","app_metadata":{"role":"chemist"}}';

do $$
begin
  begin
    perform public.chemist_start_trip(current_setting('chemtest.b1')::uuid);
    raise exception 'TEST FAILED: chemist B started chemist A''s trip';
  exception when insufficient_privilege then
    null;
  end;
  begin
    perform public.cancel_trip(current_setting('chemtest.b1')::uuid);
    raise exception 'TEST FAILED: chemist B cancelled chemist A''s trip';
  exception when insufficient_privilege then
    null;
  end;
  assert not exists (select 1 from public.chemist_my_visits() v where v.id = current_setting('chemtest.b1')::uuid),
    'chemist B sees chemist A''s visit';
  assert exists (select 1 from public.chemist_my_visits() v where v.id = current_setting('chemtest.b3')::uuid),
    'chemist B does not see their own visit';
end $$;

reset role;

-- Chemist A: the trip -------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub":"c4e0a000-0000-4000-8000-00000000000a","role":"authenticated","app_metadata":{"role":"chemist"}}';

do $$
begin
  -- Own visits: b1 (today) and b2 (unparseable date, kept, listed last).
  assert (select count(*) from public.chemist_my_visits() v
          where v.id in (current_setting('chemtest.b1')::uuid, current_setting('chemtest.b2')::uuid)) = 2,
    'chemist A should see b1 and b2';
  assert (select v.phone from public.chemist_my_visits() v where v.id = current_setting('chemtest.b1')::uuid) = '01098347261',
    'chemist_my_visits should carry the patient phone';

  -- Ping before start raises.
  begin
    perform public.chemist_ping(current_setting('chemtest.b1')::uuid, 30.05, 31.24, 10);
    raise exception 'TEST FAILED: ping accepted before the trip started';
  exception when object_not_in_prerequisite_state then
    null;
  end;

  perform public.chemist_start_trip(current_setting('chemtest.b1')::uuid);
end $$;

-- Chemist B pings A's trip while it is on the way: still refused.
set local request.jwt.claims = '{"sub":"c4e0a000-0000-4000-8000-00000000000b","role":"authenticated","app_metadata":{"role":"chemist"}}';

do $$
begin
  begin
    perform public.chemist_ping(current_setting('chemtest.b1')::uuid, 30.05, 31.24, 10);
    raise exception 'TEST FAILED: chemist B pinged chemist A''s trip';
  exception when insufficient_privilege then
    null;
  end;
end $$;

set local request.jwt.claims = '{"sub":"c4e0a000-0000-4000-8000-00000000000a","role":"authenticated","app_metadata":{"role":"chemist"}}';

do $$
begin
  -- A second start while b1 is on the way raises.
  begin
    perform public.chemist_start_trip(current_setting('chemtest.b2')::uuid);
    raise exception 'TEST FAILED: started a second trip while another is on the way';
  exception when object_not_in_prerequisite_state then
    null;
  end;

  begin
    perform public.chemist_ping(current_setting('chemtest.b1')::uuid, 91, 31.24, 10);
    raise exception 'TEST FAILED: latitude 91 accepted';
  exception when invalid_parameter_value then
    null;
  end;
  begin
    perform public.chemist_ping(current_setting('chemtest.b1')::uuid, 30.05, 'NaN'::float8, 10);
    raise exception 'TEST FAILED: NaN longitude accepted';
  exception when invalid_parameter_value then
    null;
  end;

  perform public.chemist_ping(current_setting('chemtest.b1')::uuid, 30.05, 31.24, 10);
  -- Within 10 s of the last one: dropped silently.
  perform public.chemist_ping(current_setting('chemtest.b1')::uuid, 30.06, 31.25, 10);
end $$;

reset role;

do $$
begin
  assert (select count(*) from public.chemist_pings
          where booking_id = current_setting('chemtest.b1')::uuid and at = now()) = 1,
    'expected exactly one new ping (the second must be throttled)';
  assert (select trip_status from public.bookings where id = current_setting('chemtest.b1')::uuid) = 'on_way'
     and (select trip_started_at from public.bookings where id = current_setting('chemtest.b1')::uuid) is not null,
    'chemist_start_trip did not set on_way / trip_started_at';
end $$;

-- Anon: on the way ----------------------------------------------------------

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

do $$
declare
  j jsonb;
begin
  j := public.get_trip_by_token(current_setting('chemtest.t1'))::jsonb;
  assert j ->> 'status' = 'on_way', 'status should be on_way';
  assert (j -> 'last' ->> 'lat')::float8 = 30.05 and (j -> 'last' ->> 'lng')::float8 = 31.24,
    format('last should be the newest ping (30.05, 31.24), got %s', j -> 'last');
  assert j -> 'last' ->> 'at' is not null, 'last.at missing';
  assert j ->> 'started_at' is not null, 'started_at missing';
  assert j::text !~ '"(phone|address|tests|name)"', format('get_trip_by_token leaks patient/chemist data: %s', j);
end $$;

reset role;

-- Chemist A: arrive, then b2 start + undo ----------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub":"c4e0a000-0000-4000-8000-00000000000a","role":"authenticated","app_metadata":{"role":"chemist"}}';

do $$
begin
  perform public.chemist_arrive(current_setting('chemtest.b1')::uuid);

  begin
    perform public.chemist_arrive(current_setting('chemtest.b1')::uuid);
    raise exception 'TEST FAILED: arrived twice';
  exception when object_not_in_prerequisite_state then
    null;
  end;
  begin
    perform public.chemist_ping(current_setting('chemtest.b1')::uuid, 30.05, 31.24, 10);
    raise exception 'TEST FAILED: ping accepted after arrival';
  exception when object_not_in_prerequisite_state then
    null;
  end;

  -- b1 is no longer on the way, so b2 can start; the chemist's undo puts it back.
  perform public.chemist_start_trip(current_setting('chemtest.b2')::uuid);
  perform public.cancel_trip(current_setting('chemtest.b2')::uuid, true); -- p_final ignored for a chemist
  assert exists (select 1 from public.chemist_my_visits() v
                 where v.id = current_setting('chemtest.b2')::uuid and v.trip_status = 'assigned'),
    'chemist cancel_trip should put the trip back to assigned';
end $$;

reset role;

-- Anon: arrived -------------------------------------------------------------

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

do $$
declare
  j jsonb;
begin
  j := public.get_trip_by_token(current_setting('chemtest.t1'))::jsonb;
  assert j ->> 'status' = 'arrived', 'status should be arrived';
  assert j -> 'last' = 'null'::jsonb, 'last must be null after arrival';
  assert j ->> 'arrived_at' is not null, 'arrived_at missing';
  assert j::text !~ '"(phone|address|tests|name)"', format('get_trip_by_token leaks patient/chemist data: %s', j);
end $$;

reset role;

-- Staff: final cancel, booking cancel (trigger) ----------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub":"c4e0a000-0000-4000-8000-0000000000ff","role":"authenticated","app_metadata":{}}';

do $$
begin
  -- Staff final cancel of b2's trip: link dead.
  perform public.cancel_trip(current_setting('chemtest.b2')::uuid, true);
  assert (select trip_status from public.bookings where id = current_setting('chemtest.b2')::uuid) = 'cancelled',
    'staff cancel_trip(p_final) should set cancelled';
  assert public.get_trip_by_token(current_setting('chemtest.t2')) is null, 'cancelled trip must give null';

  -- Staff cancels booking b1 (a plain status change, through the guard):
  -- the trigger ends the trip and the link goes dead.
  update public.bookings set status = 'ملغي' where id = current_setting('chemtest.b1')::uuid;
  assert (select trip_status from public.bookings where id = current_setting('chemtest.b1')::uuid) = 'cancelled',
    'bookings_cancel_trip_on_cancel did not set trip_status = cancelled';
  assert public.get_trip_by_token(current_setting('chemtest.t1')) is null, 'ملغي booking must give null';
  assert coalesce(current_setting('app.trip_rpc', true), '') <> 'on', 'cancel trigger left app.trip_rpc on';

  begin
    perform public.assign_chemist(current_setting('chemtest.b1')::uuid, 'c4e0a000-0000-4000-8000-00000000000a');
    raise exception 'TEST FAILED: assigned a chemist to a ملغي booking';
  exception when object_not_in_prerequisite_state then
    null;
  end;
end $$;

reset role;

-- 24 h after arrival the link stops working (as postgres, then anon) ------

do $$
begin
  perform set_config('app.trip_rpc', 'on', true);
  update public.bookings
  set trip_status = 'arrived', trip_started_at = now() - interval '26 hours', trip_arrived_at = now() - interval '25 hours'
  where id = current_setting('chemtest.b3')::uuid;
  perform set_config('app.trip_rpc', 'off', true);
end $$;

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

do $$
begin
  assert public.get_trip_by_token(current_setting('chemtest.t3')) is null, 'trip arrived > 24 h ago must give null';
end $$;

reset role;

-- Staff: re-assigning a cancelled / arrived trip issues a NEW token ---------

set local role authenticated;
set local request.jwt.claims = '{"sub":"c4e0a000-0000-4000-8000-0000000000ff","role":"authenticated","app_metadata":{}}';

do $$
declare
  v_new text;
begin
  -- b2: trip cancelled by staff above.
  v_new := public.assign_chemist(current_setting('chemtest.b2')::uuid, 'c4e0a000-0000-4000-8000-00000000000a');
  assert v_new ~ '^[A-Za-z0-9_-]{32}$' and v_new <> current_setting('chemtest.t2'),
    're-assigning a cancelled trip must issue a new token';
  assert public.get_trip_by_token(current_setting('chemtest.t2')) is null, 'old token of a cancelled trip came back to life';
  assert public.get_trip_by_token(v_new)::jsonb ->> 'status' = 'assigned', 'new token should show the assigned trip';

  -- b3: arrived 25 h ago.
  v_new := public.assign_chemist(current_setting('chemtest.b3')::uuid, 'c4e0a000-0000-4000-8000-00000000000b');
  assert v_new <> current_setting('chemtest.t3'), 're-assigning an arrived trip must issue a new token';
  assert public.get_trip_by_token(current_setting('chemtest.t3')) is null, 'old token of an arrived trip came back to life';
end $$;

reset role;

-- Anon INSERT cannot pre-set trip columns or pose as the call center -------

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

do $$
begin
  insert into public.bookings (booking_ref, mode, name, phone, address,
                               assigned_chemist_id, track_token, trip_status, trip_started_at, trip_arrived_at)
  values ('TEST-CHEM-0004', 'home', 'مريض اختبار ٤', '01098347270', 'عنوان اختبار ٤',
          'c4e0a000-0000-4000-8000-00000000000a', 'anon-token-anon-token-anon-token', 'on_way', now(), now());

  begin
    insert into public.bookings (booking_ref, source, mode, name, phone, address)
    values ('TEST-CHEM-0005', 'call_center', 'home', 'x', '01098347271', 'x');
    raise exception 'TEST FAILED: anon inserted a call_center booking';
  exception when insufficient_privilege then
    null; -- expected: bookings_guard_insert_trip_fields (42501)
  end;
end $$;

reset role;

do $$
begin
  assert exists (
    select 1 from public.bookings
    where booking_ref = 'TEST-CHEM-0004'
      and assigned_chemist_id is null and track_token is null and trip_status is null
      and trip_started_at is null and trip_arrived_at is null
  ), 'anon insert kept trip columns it must not set';
  assert public.get_trip_by_token('anon-token-anon-token-anon-token') is null, 'anon-chosen token works';
  assert not exists (select 1 from public.bookings where booking_ref = 'TEST-CHEM-0005'), 'call_center row from anon exists';
end $$;

-- Deactivated chemist: every chemist RPC refuses ----------------------------

update public.chemists set active = false where id = 'c4e0a000-0000-4000-8000-00000000000b';

set local role authenticated;
set local request.jwt.claims = '{"sub":"c4e0a000-0000-4000-8000-00000000000b","role":"authenticated","app_metadata":{"role":"chemist"}}';

do $$
begin
  begin
    perform public.chemist_my_visits();
    raise exception 'TEST FAILED: inactive chemist listed visits';
  exception when insufficient_privilege then
    null;
  end;
  begin
    -- b3 is assigned to B (re-assigned above), so this would start if B were active.
    perform public.chemist_start_trip(current_setting('chemtest.b3')::uuid);
    raise exception 'TEST FAILED: inactive chemist started a trip';
  exception when insufficient_privilege then
    null;
  end;
  begin
    perform public.chemist_ping(current_setting('chemtest.b3')::uuid, 30.05, 31.24, 10);
    raise exception 'TEST FAILED: inactive chemist pinged';
  exception when insufficient_privilege then
    null;
  end;
  begin
    perform public.chemist_arrive(current_setting('chemtest.b3')::uuid);
    raise exception 'TEST FAILED: inactive chemist arrived';
  exception when insufficient_privilege then
    null;
  end;
  begin
    perform public.cancel_trip(current_setting('chemtest.b3')::uuid);
    raise exception 'TEST FAILED: inactive chemist cancelled a trip';
  exception when insufficient_privilege then
    null;
  end;
end $$;

reset role;

-- Structural: grants and the lookup table (as postgres) ----------------------

do $$
begin
  assert not has_function_privilege('anon', 'public.staff_create_home_booking(text, text, text, text, date, text, text, text)', 'execute'), 'anon can execute staff_create_home_booking';
  assert not has_function_privilege('anon', 'public.assign_chemist(uuid, uuid)', 'execute'), 'anon can execute assign_chemist';
  assert not has_function_privilege('anon', 'public.chemist_ping(uuid, double precision, double precision, real)', 'execute'), 'anon can execute chemist_ping';
  assert not has_function_privilege('anon', 'public.cancel_trip(uuid, boolean)', 'execute'), 'anon can execute cancel_trip';
  assert has_function_privilege('anon', 'public.get_trip_by_token(text)', 'execute'), 'anon cannot execute get_trip_by_token';
  assert has_function_privilege('anon', 'public.find_trip(text, text)', 'execute'), 'anon cannot execute find_trip';
  assert has_function_privilege('authenticated', 'public.find_trip(text, text)', 'execute'), 'authenticated cannot execute find_trip';
  assert not has_function_privilege('anon', 'public.generate_patient_cards(int, text)', 'execute'), 'anon can execute generate_patient_cards';
  assert has_function_privilege('authenticated', 'public.generate_patient_cards(int, text)', 'execute'), 'authenticated lost generate_patient_cards';
  assert not has_function_privilege('anon', 'public.normalize_egypt_phone(text)', 'execute'), 'anon can execute normalize_egypt_phone';

  assert (select relrowsecurity from pg_class where oid = 'public.trip_lookup_attempts'::regclass), 'trip_lookup_attempts has RLS off';
  assert not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'trip_lookup_attempts'),
    'trip_lookup_attempts must have no policies';
  assert not has_table_privilege('anon', 'public.trip_lookup_attempts', 'select,insert,update,delete,truncate'), 'anon has privileges on trip_lookup_attempts';
  assert not has_table_privilege('authenticated', 'public.trip_lookup_attempts', 'select,insert,update,delete,truncate'), 'authenticated has privileges on trip_lookup_attempts';

  assert exists (select 1 from pg_trigger where tgrelid = 'public.bookings'::regclass and tgname = 'bookings_cancel_trip_on_cancel' and not tgisinternal),
    'trigger bookings_cancel_trip_on_cancel missing';
  assert exists (select 1 from pg_trigger where tgrelid = 'public.bookings'::regclass and tgname = 'bookings_guard_insert_trip_fields' and not tgisinternal),
    'trigger bookings_guard_insert_trip_fields missing';
  assert exists (select 1 from cron.job where jobname = 'trip_lookup_attempts_prune'), 'cron job trip_lookup_attempts_prune missing';

  raise notice 'chemist_tracking tests: all passed';
end $$;

rollback;
