-- Server-side phone validation — the part that can't be bypassed.
--
-- Every form checks phones in the browser (src/lib/phone.js), but the anon key
-- lets anyone insert rows directly, and the chat-assistant edge function writes
-- whatever the model extracted. These CHECK constraints make the database
-- reject a fake or malformed phone no matter where the insert comes from.
--
-- Rules (keep in sync with src/lib/phone.js and chat-assistant/index.ts):
--   * Egyptian mobile: 01 + 0/1/2/5 + 8 digits, and the 8-digit subscriber part
--     isn't filler (00000000, 12345678, 87654321, 12121212, 12312312, 7+ same digit in a row).
--   * International (+ prefix, not +20): 8–15 digits, last 8 aren't filler.
--
-- Constraints are added NOT VALID: existing rows are left alone (some may be
-- fake), only new inserts/updates are checked. To audit old rows:
--   select id, phone from complaints where not is_plausible_phone(phone);
--
-- Run once in the Supabase SQL editor.

create or replace function phone_digits_look_fake(d text)
returns boolean
language sql
immutable
as $$
  select
    d ~ '^(\d)\1+$'
    or d ~ '(\d)\1{6,}'
    or d ~ '^(\d\d)\1{3,}$'
    or (length(d) >= 8 and d = left(repeat(left(d, 3), 6), length(d)))
    or position(d in '01234567890123456789') > 0
    or position(d in '98765432109876543210') > 0
$$;

create or replace function is_plausible_phone(p text)
returns boolean
language sql
immutable
as $$
  select case
    when p is null then true -- NOT NULL is a separate concern, handled per column
    when p ~ '^01[0125][0-9]{8}$' then not phone_digits_look_fake(right(p, 8))
    when p ~ '^\+[1-9][0-9]{7,14}$' and p !~ '^\+20' then not phone_digits_look_fake(right(p, 8))
    else false
  end
$$;

alter table complaints drop constraint if exists complaints_phone_plausible;
alter table complaints add constraint complaints_phone_plausible check (is_plausible_phone(phone)) not valid;

alter table visit_ratings drop constraint if exists visit_ratings_phone_plausible;
alter table visit_ratings add constraint visit_ratings_phone_plausible check (is_plausible_phone(phone)) not valid;

alter table bookings drop constraint if exists bookings_phone_plausible;
alter table bookings add constraint bookings_phone_plausible check (is_plausible_phone(phone)) not valid;

alter table sample_tracking drop constraint if exists sample_tracking_phone_plausible;
alter table sample_tracking add constraint sample_tracking_phone_plausible check (is_plausible_phone(phone)) not valid;

-- Branch phones drive the public call / WhatsApp buttons, so they must be Egyptian mobiles.
alter table branches drop constraint if exists branches_phone_plausible;
alter table branches add constraint branches_phone_plausible check (phone ~ '^01[0125][0-9]{8}$' and is_plausible_phone(phone)) not valid;
