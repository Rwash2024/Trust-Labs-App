-- Trust Labs App — News (أخبار المعمل) + Partners (شركاء النجاح) admin-managed content
-- Run this once in the Supabase SQL Editor (after schema.sql + admin_policies.sql +
-- featured_tests_and_images_migration.sql already applied — reuses the same
-- trust-labs-images storage bucket, so no new bucket/storage policies needed here).

-- 1) News / lab announcements shown on the patient-facing "أخبار المعمل" page.
create table if not exists news (
  id serial primary key,
  title text not null,
  description text,
  image_url text,
  news_date date default current_date,
  sort_order integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table news enable row level security;

drop policy if exists "public read news" on news;
create policy "public read news" on news for select using (true);

drop policy if exists "authenticated write news" on news;
create policy "authenticated write news" on news
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- 2) Partner logos shown in the "شركاء النجاح" static grid on the home page.
create table if not exists partners (
  id serial primary key,
  name text not null,
  image_url text,
  sort_order integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table partners enable row level security;

drop policy if exists "public read partners" on partners;
create policy "public read partners" on partners for select using (true);

drop policy if exists "authenticated write partners" on partners;
create policy "authenticated write partners" on partners
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
