-- Trust Card price, editable from the admin dashboard (tab "كارت الثقة").
--
-- A singleton row (id = 1) like about_content. Public read so the Trust Card
-- page can show the price; writes are admin-only, same rule as the catalog
-- tables in branch_role_migration.sql.
--
-- Until this runs, the app falls back to DEFAULT_TRUST_CARD_PRICE in
-- src/lib/data.js (250 EGP), so the page never shows an empty price.
--
-- Run once in the Supabase SQL editor.

create table if not exists app_settings (
  id int primary key default 1,
  trust_card_price numeric not null default 250 check (trust_card_price > 0),
  updated_at timestamptz not null default now(),
  constraint app_settings_singleton check (id = 1)
);

insert into app_settings (id, trust_card_price) values (1, 250) on conflict (id) do nothing;

alter table app_settings enable row level security;

drop policy if exists "public read app_settings" on app_settings;
create policy "public read app_settings" on app_settings for select using (true);

drop policy if exists "admin write app_settings" on app_settings;
create policy "admin write app_settings" on app_settings
  for all using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
