-- Trust Labs App — Admin write access
-- Run this AFTER schema.sql. Grants write (insert/update/delete) on the
-- catalog tables to any authenticated Supabase user (i.e. your admin login).
-- Public (anon) access stays read-only, as set up in schema.sql.

drop policy if exists "authenticated write packages" on packages;
create policy "authenticated write packages" on packages
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "authenticated write tests" on tests;
create policy "authenticated write tests" on tests
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "authenticated write prep_instructions" on prep_instructions;
create policy "authenticated write prep_instructions" on prep_instructions
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "authenticated write branches" on branches;
create policy "authenticated write branches" on branches
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
