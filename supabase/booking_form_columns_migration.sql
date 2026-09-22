-- Trust Labs App — extra columns so the regular booking form (Booking.jsx) can
-- also be persisted in `bookings`, alongside chat-assistant bookings.
-- Run this in the Supabase SQL editor after chat_bookings_migration.sql.
--
-- The booking form still submits to Formspree as before (that stays the
-- source of truth for the confirmation email); this insert is additive, so
-- staff can see every booking — chat or form, home or branch — in one place
-- in the admin dashboard, and so a patient's phone number can later be
-- checked against a real booking (e.g. for the visit-rating survey).

alter table bookings add column if not exists payment_method text; -- 'كاش' or 'فيزا (أونلاين)'
alter table bookings add column if not exists patient_type text; -- 'Normal' / 'لديه كارنيه تأمين طبي' / 'لديه كارنيه نادي'
alter table bookings add column if not exists card_issuer text; -- insurance company or club name, if provided
alter table bookings add column if not exists launch_offer_applied boolean not null default false;
