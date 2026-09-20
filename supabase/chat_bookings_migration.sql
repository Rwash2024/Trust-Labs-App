-- Trust Labs App — Bookings created via the AI chat assistant
-- Run this in the Supabase SQL editor after schema.sql + admin_policies.sql.
--
-- The regular booking form (Booking.jsx) still sends to Formspree only.
-- Bookings made through the chat assistant are additionally persisted here
-- so staff can see/manage them in the admin dashboard, same shape as
-- sample_tracking / complaints (public insert, staff-only read/update).

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  booking_ref text not null unique,
  source text not null default 'chat_assistant',
  mode text not null check (mode in ('home', 'branch')),
  name text not null,
  phone text not null,
  dob date,
  address text,
  branch_name text,
  preferred_date text,
  tests jsonb not null default '[]'::jsonb,
  subtotal integer not null default 0,
  home_visit_fee integer not null default 0,
  total integer not null default 0,
  notes text,
  status text not null default 'جديد'
    check (status in ('جديد', 'تم التأكيد', 'تم السحب', 'ملغي')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bookings_phone_idx on bookings (phone);

alter table bookings enable row level security;

drop policy if exists "public insert bookings" on bookings;
create policy "public insert bookings" on bookings
  for insert with check (true);

drop policy if exists "authenticated read bookings" on bookings;
create policy "authenticated read bookings" on bookings
  for select using (auth.role() = 'authenticated');

drop policy if exists "authenticated update bookings" on bookings;
create policy "authenticated update bookings" on bookings
  for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
