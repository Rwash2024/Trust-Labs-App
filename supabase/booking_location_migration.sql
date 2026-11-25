-- Trust Labs App — optional map pin on home-visit bookings.
-- Run once in the Supabase SQL editor, after booking_form_columns_migration.sql,
-- spam_protection_migration.sql and bookings_staff_guard_migration.sql.
--
-- The booking form (Booking.jsx) lets the patient attach either:
--   - a one-shot GPS fix from their browser (lat / lng / accuracy in metres),
--     when they say they are at the visit address right now, or
--   - a pasted Google Maps / WhatsApp location link, when the visit is
--     somewhere else (e.g. booking for a parent).
-- The written address stays required; the pin only helps the chemist find the
-- building. Until this runs, the form saves bookings without the pin.

alter table bookings add column if not exists location_lat double precision;
alter table bookings add column if not exists location_lng double precision;
alter table bookings add column if not exists location_accuracy_m integer;
alter table bookings add column if not exists location_link text;

alter table bookings drop constraint if exists bookings_location_chk;
alter table bookings add constraint bookings_location_chk check (
  (location_lat is null) = (location_lng is null)
  and (location_lat is null or location_lat between -90 and 90)
  and (location_lng is null or location_lng between -180 and 180)
  and (location_accuracy_m is null or location_accuracy_m between 0 and 100000)
  and (location_link is null or (char_length(location_link) <= 500 and location_link like 'https://%'))
);

-- Staff (call-center / branch) may move a booking's status but not rewrite
-- what the patient submitted, so the location columns join the guarded list.
-- Same function as bookings_staff_guard_migration.sql, plus the four columns.
create or replace function bookings_guard_staff_edits()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.role() is distinct from 'authenticated'
     or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' then
    return new;
  end if;

  if new.booking_ref is distinct from old.booking_ref
     or new.source is distinct from old.source
     or new.mode is distinct from old.mode
     or new.name is distinct from old.name
     or new.phone is distinct from old.phone
     or new.dob is distinct from old.dob
     or new.address is distinct from old.address
     or new.branch_name is distinct from old.branch_name
     or new.preferred_date is distinct from old.preferred_date
     or new.tests is distinct from old.tests
     or new.subtotal is distinct from old.subtotal
     or new.home_visit_fee is distinct from old.home_visit_fee
     or new.total is distinct from old.total
     or new.notes is distinct from old.notes
     or new.payment_method is distinct from old.payment_method
     or new.patient_type is distinct from old.patient_type
     or new.card_issuer is distinct from old.card_issuer
     or new.location_lat is distinct from old.location_lat
     or new.location_lng is distinct from old.location_lng
     or new.location_accuracy_m is distinct from old.location_accuracy_m
     or new.location_link is distinct from old.location_link
     or new.created_at is distinct from old.created_at then
    raise exception 'Only an admin account can edit a booking''s details';
  end if;

  return new;
end;
$$;
