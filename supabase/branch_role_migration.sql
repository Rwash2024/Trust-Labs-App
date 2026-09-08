-- Trust Labs App — Real role separation (admin vs. branch staff)
-- Run this AFTER schema.sql + admin_policies.sql (+ featured_tests_and_images_migration.sql).
--
-- Problem: every existing "authenticated write X" policy grants ANY logged-in
-- Supabase user full write access to ALL catalog tables. That was fine while
-- the only login was the owner's personal account, but branch staff now need
-- their own accounts that can ONLY touch sample_tracking — not packages,
-- prices, tests, branches, About content, or uploaded images.
--
-- Fix: tighten every catalog table's write policy to require
-- app_metadata.role = 'admin' (a claim only settable server-side, via SQL,
-- never by the user themselves) instead of merely being logged in.
-- sample_tracking is intentionally left untouched — any authenticated user
-- (admin or branch) keeps read/write there.
--
-- This drops whatever write policy currently exists on each table (by
-- querying pg_policies, not by guessing exact names — about_content's
-- policy in particular was created manually and isn't in this repo) and
-- replaces it with the admin-gated version.

do $$
declare
  tbl text;
  pol record;
begin
  foreach tbl in array array['packages', 'tests', 'prep_instructions', 'branches', 'featured_tests', 'about_content']
  loop
    for pol in
      select policyname from pg_policies
      where schemaname = 'public' and tablename = tbl and cmd in ('ALL', 'INSERT', 'UPDATE', 'DELETE')
    loop
      execute format('drop policy %I on public.%I', pol.policyname, tbl);
    end loop;

    execute format(
      'create policy %I on public.%I for all using ((auth.jwt() -> ''app_metadata'' ->> ''role'') = ''admin'') with check ((auth.jwt() -> ''app_metadata'' ->> ''role'') = ''admin'')',
      'admin write ' || tbl, tbl
    );
  end loop;

  for pol in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and cmd in ('ALL', 'INSERT', 'UPDATE', 'DELETE')
      and policyname ilike '%trust-labs-images%'
  loop
    execute format('drop policy %I on storage.objects', pol.policyname);
  end loop;
end $$;

create policy "admin write trust-labs-images" on storage.objects
  for all using (
    bucket_id = 'trust-labs-images' and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  with check (
    bucket_id = 'trust-labs-images' and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- Last step (run separately, with YOUR OWN email — do this for the site
-- owner's account only, never for a branch account):
--
-- update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}'::jsonb
-- where email = 'YOUR_EMAIL_HERE';
--
-- Then sign out and back in so the new claim lands in a fresh JWT.
