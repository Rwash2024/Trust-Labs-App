-- Trust Labs App — Paymob online card payments
-- Run in the Supabase SQL Editor after chat_bookings_migration.sql and
-- booking_form_columns_migration.sql. Safe to re-run.
--
-- What it does
--   1. bookings.payment_status — null for cash bookings; for "فيزا (أونلاين)"
--      bookings it starts as 'pending' and only the paymob-webhook function
--      (or staff in the dashboard) moves it on.
--   2. A BEFORE INSERT trigger that overrides whatever payment_status the
--      client sent. Anyone can insert into bookings with the public anon key,
--      so without this a visitor could insert a row that already says 'paid'.
--   3. payments — one row per booking that goes through Paymob: the amount WE
--      computed server-side (from tests/packages prices, never from the
--      browser), the Paymob transaction id, and the status. No public
--      policies: only the Edge Functions (service role) write to it.

alter table bookings add column if not exists payment_status text;

alter table bookings drop constraint if exists bookings_payment_status_chk;
alter table bookings add constraint bookings_payment_status_chk
  check (payment_status is null or payment_status in ('pending', 'paid', 'failed', 'refunded', 'voided'));

create or replace function public.force_booking_payment_status()
returns trigger
language plpgsql
as $$
begin
  new.payment_status := case when new.payment_method like 'فيزا%' then 'pending' else null end;
  return new;
end;
$$;

drop trigger if exists bookings_force_payment_status on bookings;
create trigger bookings_force_payment_status
  before insert on bookings
  for each row execute function public.force_booking_payment_status();

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  booking_ref text not null unique references bookings (booking_ref) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'EGP',
  intention_id text,
  paymob_transaction_id bigint unique,
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'refunded', 'voided')),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Paymob's own order id (the intention's `intention_order_id`). It is covered by the
-- callback's HMAC, unlike merchant_order_id, so the webhook finds the payment through it.
alter table payments add column if not exists paymob_order_id bigint unique;

alter table payments enable row level security;

drop policy if exists "authenticated read payments" on payments;
create policy "authenticated read payments" on payments
  for select using (auth.role() = 'authenticated');
