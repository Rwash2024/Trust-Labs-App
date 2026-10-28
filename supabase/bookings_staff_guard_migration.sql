-- Bookings: the call-center / branch account (any logged-in non-admin) can
-- already read bookings and update them (chat_bookings_migration.sql). They
-- confirm each booking with the patient, so they move its status
-- (جديد → تم التأكيد → تم السحب / ملغي) — but they should not be able to
-- rewrite what the patient booked (name, phone, tests, prices, address...).
--
-- Same approach as complaints_staff_permissions_migration.sql: RLS can't tell
-- "changed the status" from "changed the details" on one UPDATE, so a trigger
-- blocks logged-in non-admins from touching anything but status / updated_at.
-- Service-role writes (the ERP forward and payment webhooks mark synced_to_erp
-- and payment state) are not "authenticated" users and pass through untouched.
--
-- Run once in the Supabase SQL editor.

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
     or new.created_at is distinct from old.created_at then
    raise exception 'Only an admin account can edit a booking''s details';
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_guard_staff_edits_trigger on bookings;
create trigger bookings_guard_staff_edits_trigger
  before update on bookings
  for each row execute function bookings_guard_staff_edits();
