-- Trust Card orders, saved in the app (not only emailed via Formspree), so
-- an order is never lost to a mail problem and staff can track each one from
-- the admin tab "كارت الثقة".
--
-- Anyone (anon) can place an order; only admins (app_metadata.role = 'admin',
-- same rule as branch_role_migration.sql) can read, update or delete — branch
-- staff accounts can't see buyers' names, relationships and phones.
--
-- Requires phone_validation_migration.sql (is_plausible_phone).
-- Run once in the Supabase SQL editor.

create table if not exists trust_card_requests (
  id uuid primary key default gen_random_uuid(),
  for_whom text not null check (for_whom in ('self', 'other')),
  buyer_name text not null check (length(trim(buyer_name)) > 0),
  card_holder_name text not null check (array_length(regexp_split_to_array(trim(card_holder_name), '\s+'), 1) >= 4),
  relationship text check ((for_whom = 'other') = (relationship is not null)),
  phone text not null check (phone ~ '^01[0125][0-9]{8}$' and is_plausible_phone(phone)),
  price numeric not null default 0 check (price >= 0), -- set by trigger below
  status text not null default 'جديد'
    check (status in ('جديد', 'تم التواصل', 'تم التفعيل', 'ملغي')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The price is stamped from app_settings at insert time — never trusted from
-- the browser, where anyone could edit it before submitting.
create or replace function set_trust_card_request_price()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  new.price := coalesce((select trust_card_price from app_settings where id = 1), 250);
  return new;
end;
$$;

drop trigger if exists trust_card_requests_set_price on trust_card_requests;
create trigger trust_card_requests_set_price
  before insert on trust_card_requests
  for each row execute function set_trust_card_request_price();

create index if not exists trust_card_requests_created_idx on trust_card_requests (created_at desc);

alter table trust_card_requests enable row level security;

drop policy if exists "public insert trust_card_requests" on trust_card_requests;
create policy "public insert trust_card_requests" on trust_card_requests
  for insert with check (status = 'جديد');

drop policy if exists "admin manage trust_card_requests" on trust_card_requests;
create policy "admin manage trust_card_requests" on trust_card_requests
  for all using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
