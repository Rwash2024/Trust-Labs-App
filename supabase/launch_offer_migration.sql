-- Trust Labs App — "First 100 bookings" launch offer
-- Run this in the Supabase SQL editor after schema.sql + admin_policies.sql.
--
-- Tracks redemptions of the launch offer (home-visit fee waived for the first
-- 100 completed bookings, one per phone number). The raw table holds phone
-- numbers so it is NOT publicly readable/writable directly — patients only
-- ever touch it through the two security-definer functions below, which is
-- also what makes the redemption atomic (no two concurrent bookings can both
-- grab the last seat).

create table if not exists launch_offer_redemptions (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique,
  booking_ref text,
  created_at timestamptz not null default now()
);

alter table launch_offer_redemptions enable row level security;

drop policy if exists "authenticated read launch_offer_redemptions" on launch_offer_redemptions;
create policy "authenticated read launch_offer_redemptions" on launch_offer_redemptions
  for select using (auth.role() = 'authenticated');

-- Public read: remaining-seats count only, no phone numbers exposed. This
-- function bypasses RLS (security definer) so anon can call it directly.
create or replace function get_launch_offer_remaining()
returns int
language sql security definer set search_path = public as $$
  select greatest(0, 100 - (select count(*)::int from launch_offer_redemptions));
$$;

grant execute on function get_launch_offer_remaining() to anon, authenticated;

-- Public write: attempts to claim one seat for p_phone. Returns true if this
-- call actually waived the fee (seat available and this phone hadn't already
-- redeemed), false otherwise (offer full, or phone already used its one seat).
-- pg_advisory_xact_lock serializes concurrent callers so two bookings can't
-- both squeeze past the 100 cap at the same time.
create or replace function redeem_launch_offer(p_phone text, p_booking_ref text)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_used int;
begin
  perform pg_advisory_xact_lock(hashtext('launch_offer_redemptions'));

  select count(*) into v_used from launch_offer_redemptions;
  if v_used >= 100 then
    return false;
  end if;

  insert into launch_offer_redemptions (phone, booking_ref)
  values (p_phone, p_booking_ref)
  on conflict (phone) do nothing;

  return found;
end;
$$;

grant execute on function redeem_launch_offer(text, text) to anon, authenticated;
