-- Trust Labs App — Featured tests table + package/featured-test image support
-- Run this once in the Supabase SQL Editor (after schema.sql + admin_policies.sql already applied).

-- 1) New table for the admin-managed "تحاليل مميزة" home page carousel.
create table if not exists featured_tests (
  id serial primary key,
  name text not null,
  price integer not null,
  highlight text,
  image_url text,
  sort_order integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table featured_tests enable row level security;

drop policy if exists "public read featured_tests" on featured_tests;
create policy "public read featured_tests" on featured_tests for select using (true);

drop policy if exists "authenticated write featured_tests" on featured_tests;
create policy "authenticated write featured_tests" on featured_tests
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- 2) Let packages carry an admin-uploaded photo. When set, this overrides the bundled
--    local image (packageImages.js) that packages currently ship with.
alter table packages add column if not exists image_url text;

-- 3) Storage bucket for uploaded images (featured tests + package photos), public read.
insert into storage.buckets (id, name, public)
values ('trust-labs-images', 'trust-labs-images', true)
on conflict (id) do nothing;

drop policy if exists "public read trust-labs-images" on storage.objects;
create policy "public read trust-labs-images" on storage.objects
  for select using (bucket_id = 'trust-labs-images');

drop policy if exists "authenticated write trust-labs-images" on storage.objects;
create policy "authenticated write trust-labs-images" on storage.objects
  for insert with check (bucket_id = 'trust-labs-images' and auth.role() = 'authenticated');

drop policy if exists "authenticated update trust-labs-images" on storage.objects;
create policy "authenticated update trust-labs-images" on storage.objects
  for update using (bucket_id = 'trust-labs-images' and auth.role() = 'authenticated');

drop policy if exists "authenticated delete trust-labs-images" on storage.objects;
create policy "authenticated delete trust-labs-images" on storage.objects
  for delete using (bucket_id = 'trust-labs-images' and auth.role() = 'authenticated');

-- Optional: seed the 5 featured tests already agreed with the user (NIPT + sport package
-- keep placeholder prices — edit them for real once confirmed). Images stay null until
-- uploaded from Admin > تحاليل مميزة.
insert into featured_tests (name, price, highlight, sort_order) values
  ('NIPT', 9999, 'فحص ما قبل الولادة الغير جراحي (NIPT) — نتيجة دقيقة وآمنة لصحة الجنين من عينة دم بسيطة', 0),
  ('Homocysteine Serum', 1505, 'مؤشر مهم لصحة القلب والأوعية الدموية ومستويات فيتامين B', 1),
  ('HOMA-IR', 706, 'قياس مقاومة الأنسولين — خطوة أساسية لمتابعة السكر والتمثيل الغذائي', 2),
  ('Food Print 60', 7200, 'اكتشف حساسية جسمك من 60 نوع أكل مختلف وحسّن نظامك الغذائي', 3),
  ('باقة رياضية', 9999, 'باقة تحاليل متكاملة للرياضيين ومحبي اللياقة البدنية', 4)
on conflict do nothing;
