-- Trust Labs App — "كارت الثقة" medical-file cards, replacing the MedCloud
-- QR/JWT flow entirely (that flow returned a real patient's full medical
-- file to anyone who scanned an unactivated card — no login, no expiry).
--
-- Design, on purpose different from MedCloud's:
--   1. A card_code by itself proves nothing. A card is inert until a
--      patient activates it with their own phone number, and the file is
--      only ever returned when BOTH card_code and phone match.
--   2. Medical content (diagnoses/medications/investigation/imaging) is
--      never patient-writable — only staff (authenticated) can set it,
--      via the admin dashboard, same as sample_tracking.
--   3. No column here is publicly selectable directly; every patient-facing
--      read/write goes through a security-definer function below.
--
-- Known gap for later hardening: activate/get are not rate-limited, so a
-- card_code could in principle be brute-forced if phone numbers were also
-- guessable. Fine for a first version; revisit if this card program grows
-- (e.g. add an attempts table + lockout, or move activation behind an SMS
-- OTP once we have a provider).
--
-- Run this in the Supabase SQL Editor after schema.sql + admin_policies.sql.

create table if not exists patient_cards (
  id uuid primary key default gen_random_uuid(),
  card_code text not null unique,
  phone text,
  name text,
  gender text check (gender in ('male', 'female')),
  dob date,
  marital_status text,
  blood_group text,
  address text,
  emergency_phone text,
  diagnoses text,
  current_medications text,
  investigation text,
  imaging text,
  activated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists patient_cards_phone_idx on patient_cards (phone);

alter table patient_cards enable row level security;

-- Staff only — patients never touch this table directly, only the two
-- functions below.
drop policy if exists "authenticated read patient_cards" on patient_cards;
create policy "authenticated read patient_cards" on patient_cards
  for select using (auth.role() = 'authenticated');

drop policy if exists "authenticated write patient_cards" on patient_cards;
create policy "authenticated write patient_cards" on patient_cards
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- First scan of a fresh card: the patient registers their own info and the
-- card gets tied to their phone number forever after. Fails closed if the
-- code doesn't exist or was already activated (by anyone, including the
-- same patient re-submitting) — caller shows the right message per status.
create or replace function activate_patient_card(
  p_card_code text,
  p_phone text,
  p_name text,
  p_gender text,
  p_dob date,
  p_marital_status text,
  p_blood_group text,
  p_address text,
  p_emergency_phone text
)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_row patient_cards;
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
    activated_at = now(),
    updated_at = now()
  where card_code = p_card_code;

  return 'activated';
end;
$$;

grant execute on function activate_patient_card(text, text, text, text, date, text, text, text, text) to anon, authenticated;

-- Returning visit: exact card_code + phone match only, nothing else exposed.
-- No match (wrong phone, wrong code, or not yet activated) returns zero rows
-- — the caller can't tell which of those it was, on purpose.
create or replace function get_patient_file(p_card_code text, p_phone text)
returns table (
  name text,
  gender text,
  dob date,
  marital_status text,
  blood_group text,
  address text,
  phone text,
  emergency_phone text,
  diagnoses text,
  current_medications text,
  investigation text,
  imaging text
)
language sql security definer set search_path = public as $$
  select name, gender, dob, marital_status, blood_group, address, phone, emergency_phone,
         diagnoses, current_medications, investigation, imaging
  from patient_cards
  where card_code = p_card_code and phone is not null and phone = p_phone;
$$;

grant execute on function get_patient_file(text, text) to anon, authenticated;

-- Bulk-generates N fresh, unactivated card codes (6-char lowercase-base36,
-- same shape as the ones already printed: e.g. 587lhv) for a print run.
-- Run e.g. `select generate_patient_cards(700);` in the SQL editor and copy
-- the result column to whoever is building the QR/print file.
create or replace function generate_patient_cards(p_count int)
returns setof text
language plpgsql security definer set search_path = public as $$
declare
  v_code text;
  v_generated int := 0;
begin
  while v_generated < p_count loop
    v_code := array_to_string(
      array(
        select substr('0123456789abcdefghijklmnopqrstuvwxyz', floor(random() * 36)::int + 1, 1)
        from generate_series(1, 6)
      ),
      ''
    );

    begin
      insert into patient_cards (card_code) values (v_code);
      v_generated := v_generated + 1;
      return next v_code;
    exception when unique_violation then
      -- collision on a 36^6 space is rare but retry rather than fail the batch
      null;
    end;
  end loop;
end;
$$;
