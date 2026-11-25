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

  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'chemist_blocked') then
    raise notice 'storage.objects has no chemist_blocked policy (migration lacked privilege?) — review storage policies by hand';
  end if;
end $$;

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

  raise notice 'chemist_tracking tests: all passed';
end $$;

rollback;
