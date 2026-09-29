-- Trust Labs App — lets staff attach an actual lab/imaging report (PDF or
-- image) to a patient's التحاليل / الأشعة sections, not just a text summary.
-- Run after patient_cards_family_card_type_migration.sql.
--
-- Reports are NOT public like patient-photos — a full lab report is exactly
-- the kind of data the original MedCloud leak exposed, so the bucket stays
-- private and every download goes through the get-patient-report-url edge
-- function, which re-checks card_code+phone (or the family member's card)
-- before minting a short-lived signed URL. Staff (authenticated) can
-- upload/manage files directly; nothing else can.

alter table patient_cards add column if not exists investigation_file_path text;
alter table patient_cards add column if not exists imaging_file_path text;
alter table family_members add column if not exists investigation_file_path text;
alter table family_members add column if not exists imaging_file_path text;

insert into storage.buckets (id, name, public)
values ('patient-reports', 'patient-reports', false)
on conflict (id) do nothing;

drop policy if exists "staff manage patient reports" on storage.objects;
create policy "staff manage patient reports" on storage.objects
  for all to authenticated
  using (bucket_id = 'patient-reports')
  with check (bucket_id = 'patient-reports');

-- get_patient_file / get_family_members need the two new columns so the app
-- knows a report exists and can show a "تحميل التقرير" button — this is just
-- the storage path string, useless without hitting the edge function below
-- with the same phone the patient already verified, so it's fine to return.
drop function if exists get_patient_file(text, text);

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
  photo_url text,
  card_type text,
  investigation_file_path text,
  imaging_file_path text
)
language sql security definer set search_path = public as $$
  select name, gender, dob, marital_status, blood_group, address, phone, emergency_phone,
         diagnoses, current_medications, investigation, imaging, photo_url, card_type,
         investigation_file_path, imaging_file_path
  from patient_cards
  where card_code = p_card_code and phone is not null and phone = p_phone;
$$;

grant execute on function get_patient_file(text, text) to anon, authenticated;

drop function if exists get_family_members(text, text);

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
  photo_url text,
  investigation_file_path text,
  imaging_file_path text
)
language sql security definer set search_path = public as $$
  select fm.id, fm.relation, fm.name, fm.gender, fm.dob, fm.blood_group,
         fm.diagnoses, fm.current_medications, fm.investigation, fm.imaging, fm.photo_url,
         fm.investigation_file_path, fm.imaging_file_path
  from family_members fm
  where fm.card_code = p_card_code
    and exists (
      select 1 from patient_cards pc
      where pc.card_code = p_card_code and pc.phone is not null and pc.phone = p_phone
    )
  order by fm.created_at;
$$;

grant execute on function get_family_members(text, text) to anon, authenticated;
