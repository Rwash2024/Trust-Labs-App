-- Trust Labs App — English package names for the international-patient page
-- Run this in the Supabase SQL editor after foreign_pricing_migration.sql.
--
-- packages.name is Arabic only. The /international page is English/LTR, so
-- it needs an English label per package. Adds name_en and updates
-- packages_foreign to show it (falling back to the Arabic name if a future
-- new package hasn't been translated yet).

alter table packages add column if not exists name_en text;

create or replace view packages_foreign as
  select id, coalesce(name_en, name) as name, price_foreign as price, test_count, tests, image_key, image_url, sort_order
  from packages
  where price_foreign is not null;

grant select on packages_foreign to anon, authenticated;

-- Seed English names for the current packages — edit any of these in
-- Admin > الباقات ("English name" field) any time.
update packages set name_en = 'Gold Package (Men)' where id = 'golden-men';
update packages set name_en = 'Gold Package (Women)' where id = 'golden-women';
update packages set name_en = 'Ramadan Package' where id = 'ramadan';
update packages set name_en = 'Silver Package' where id = 'silver';
update packages set name_en = 'Bronze Package' where id = 'bronze';
update packages set name_en = 'Liver Package' where id = 'liver';
update packages set name_en = 'Fertility Package (Men)' where id = 'fertility-men';
update packages set name_en = 'Fertility Package (Women)' where id = 'fertility-women';
update packages set name_en = 'Thyroid Package' where id = 'thyroid';
update packages set name_en = 'Kidney Package' where id = 'kidney';
update packages set name_en = 'Children''s Package' where id = 'children';
update packages set name_en = 'Pregnancy Package' where id = 'pregnancy';
update packages set name_en = 'Bone Pain Package' where id = 'bone-pain';
