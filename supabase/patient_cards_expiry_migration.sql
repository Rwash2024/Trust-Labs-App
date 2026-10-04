-- كارت الثقة: one-year membership starts at activation.
-- Adds expires_at (activated_at + 1 year, set inside activate_patient_card so
-- the clock is the server's, never the phone's) and returns both dates to the
-- patient through get_patient_file so the app can show the countdown.
-- The 25% discount itself is a fixed program term (see TrustCard.jsx), not a column.

alter table public.patient_cards add column if not exists expires_at timestamptz;

-- Backfill any card that was activated before this migration.
update public.patient_cards
   set expires_at = activated_at + interval '1 year'
 where activated_at is not null and expires_at is null;

create or replace function public.activate_patient_card(
  p_card_code text,
  p_phone text,
  p_name text,
  p_gender text,
  p_dob date,
  p_marital_status text,
  p_blood_group text,
  p_address text,
  p_emergency_phone text,
  p_photo_url text default null
)
returns text
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_row patient_cards;
  v_now timestamptz := now();
begin
  select * into v_row from patient_cards where card_code = p_card_code for update;

  if not found then
    return 'invalid_code';
  end if;

  if v_row.phone is not null then
    return 'already_activated';
  end if;

  update patient_cards set
    phone = p_phone,
    name = p_name,
    gender = p_gender,
    dob = p_dob,
    marital_status = p_marital_status,
    blood_group = p_blood_group,
    address = p_address,
    emergency_phone = p_emergency_phone,
    photo_url = p_photo_url,
    activated_at = v_now,
    expires_at = v_now + interval '1 year',
    updated_at = v_now
  where card_code = p_card_code;

  return 'activated';
end;
$function$;

-- Return type changes (two new columns), so the function has to be dropped first.
drop function if exists public.get_patient_file(text, text);

create function public.get_patient_file(p_card_code text, p_phone text)
returns table(
  name text, gender text, dob date, marital_status text, blood_group text,
  address text, phone text, emergency_phone text, diagnoses text,
  current_medications text, investigation text, imaging text, photo_url text,
  card_type text, investigation_file_path text, imaging_file_path text,
  activated_at timestamptz, expires_at timestamptz
)
language sql
security definer
set search_path to 'public'
as $function$
  select name, gender, dob, marital_status, blood_group, address, phone, emergency_phone,
         diagnoses, current_medications, investigation, imaging, photo_url, card_type,
         investigation_file_path, imaging_file_path, activated_at, expires_at
  from patient_cards
  where card_code = p_card_code and phone is not null and phone = p_phone;
$function$;

