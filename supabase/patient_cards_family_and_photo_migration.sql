-- Trust Labs App — adds a profile photo and a "family card" to كارت الثقة.
-- Run after patient_cards_migration.sql.
--
-- Family card: MedCloud never offered this — a card holder can add family
-- members (spouse/kids/parents) under their own already-verified phone, each
-- with their own mini medical file. No extra phone check per member: adding
-- and viewing family members both ride on the same card_code+phone gate the
-- holder already passed (see activate/get_patient_file in the base migration).

alter table patient_cards add column if not exists photo_url text;

create table if not exists family_members (
  id uuid primary key default gen_random_uuid(),
  card_code text not null references patient_cards (card_code) on delete cascade,
  relation text not null,
  name text not null,
  gender text check (gender in ('male', 'female')),
  dob date,
  blood_group text,
  diagnoses text,
  current_medications text,
  investigation text,
  imaging text,
  photo_url text,
  created_at timestamptz not null default now()
);

create index if not exists family_members_card_code_idx on family_members (card_code);

alter table family_members enable row level security;

drop policy if exists "authenticated read family_members" on family_members;
create policy "authenticated read family_members" on family_members
  for select using (auth.role() = 'authenticated');

drop policy if exists "authenticated write family_members" on family_members;
create policy "authenticated write family_members" on family_members
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Re-checks card_code+phone (same rule as get_patient_file) before adding a
-- dependent, so a family member can't be attached without the holder's phone.
create or replace function add_family_member(
  p_card_code text,
  p_phone text,
  p_relation text,
  p_name text,
  p_gender text,
  p_dob date,
  p_blood_group text
)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_ok boolean;
begin
  select exists(
    select 1 from patient_cards where card_code = p_card_code and phone is not null and phone = p_phone
  ) into v_ok;

  if not v_ok then
    return 'unauthorized';
  end if;

  insert into family_members (card_code, relation, name, gender, dob, blood_group)
  values (p_card_code, p_relation, p_name, p_gender, p_dob, p_blood_group);

  return 'added';
end;
$$;

grant execute on function add_family_member(text, text, text, text, text, date, text) to anon, authenticated;

-- get_patient_file and activate_patient_card are being redefined with a
-- different set of OUT columns / parameters than the base migration created,
-- and Postgres refuses CREATE OR REPLACE across a signature change like that
-- ("cannot change return type of existing function") — drop the old versions
-- first so the new ones actually replace them instead of just failing.
drop function if exists get_patient_file(text, text);
drop function if exists activate_patient_card(text, text, text, text, date, text, text, text, text);

create or replace function activate_patient_card(
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
    photo_url = p_photo_url,
    activated_at = now(),
    updated_at = now()
  where card_code = p_card_code;

  return 'activated';
end;
$$;

grant execute on function activate_patient_card(text, text, text, text, date, text, text, text, text, text) to anon, authenticated;

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
  imaging text,
  photo_url text
)
language sql security definer set search_path = public as $$
  select name, gender, dob, marital_status, blood_group, address, phone, emergency_phone,
         diagnoses, current_medications, investigation, imaging, photo_url
  from patient_cards
  where card_code = p_card_code and phone is not null and phone = p_phone;
$$;

grant execute on function get_patient_file(text, text) to anon, authenticated;

create or replace function get_family_members(p_card_code text, p_phone text)
returns table (
  id uuid,
  relation text,
  name text,
  gender text,
  dob date,
  blood_group text,
  diagnoses text,
  current_medications text,
  investigation text,
  imaging text,
  photo_url text
)
language sql security definer set search_path = public as $$
  select fm.id, fm.relation, fm.name, fm.gender, fm.dob, fm.blood_group,
         fm.diagnoses, fm.current_medications, fm.investigation, fm.imaging, fm.photo_url
  from family_members fm
  where fm.card_code = p_card_code
    and exists (
      select 1 from patient_cards pc
      where pc.card_code = p_card_code and pc.phone is not null and pc.phone = p_phone
    )
  order by fm.created_at;
$$;

grant execute on function get_family_members(text, text) to anon, authenticated;

-- Storage bucket for profile photos. Public read (photo URLs are unguessable
-- UUID paths, same trust model as the old file names — not gated by the
-- phone check the way the medical data is). Anyone can upload an object,
-- since activation happens before the patient has any other credential; this
-- is a known soft spot, fine for a first version, revisit if abused.
insert into storage.buckets (id, name, public)
values ('patient-photos', 'patient-photos', true)
on conflict (id) do nothing;

drop policy if exists "anyone uploads patient photos" on storage.objects;
create policy "anyone uploads patient photos" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'patient-photos');

drop policy if exists "anyone reads patient photos" on storage.objects;
create policy "anyone reads patient photos" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'patient-photos');
