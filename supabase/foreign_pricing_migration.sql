-- Trust Labs App — Foreign-patient pricing
-- Run this in the Supabase SQL editor after schema.sql + admin_policies.sql.
--
-- Adds a second price column for foreign patients on tests/packages, and
-- makes sure the public (anon) API can NEVER see both price columns in the
-- same request — the app for Egyptian patients only ever reads through the
-- *_local views (which don't expose price_foreign at all), and a future
-- foreign-facing experience would read through the *_foreign views (which
-- don't expose the local `price` column at all). Distribution of that
-- foreign-facing link/app is a staff-controlled install, not a public QR —
-- this migration only handles the data side of that separation.
--
-- Admin (authenticated) keeps full direct access to both tables/columns as
-- before, unaffected by this change.

alter table tests add column if not exists price_foreign numeric;
alter table packages add column if not exists price_foreign numeric;

-- Anon can no longer read the base tables directly — only through the
-- column-restricted views below. Authenticated (admin) access is untouched.
revoke select on tests from anon;
revoke select on packages from anon;

create or replace view tests_local as
  select code, name, price, popular from tests;

create or replace view tests_foreign as
  select code, name, price_foreign as price, popular from tests
  where price_foreign is not null;

create or replace view packages_local as
  select id, name, price, test_count, tests, image_key, image_url, sort_order from packages;

create or replace view packages_foreign as
  select id, name, price_foreign as price, test_count, tests, image_key, image_url, sort_order from packages
  where price_foreign is not null;

grant select on tests_local, tests_foreign, packages_local, packages_foreign to anon, authenticated;
