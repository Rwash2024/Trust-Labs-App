-- Trust Labs App — Sample tracking (manual, staff-entered)
-- Run this in the Supabase SQL editor after schema.sql + admin_policies.sql.
--
-- This table holds patient names, so unlike the catalog tables it is NOT
-- publicly readable. Staff (authenticated admin) can list/insert/update it;
-- patients look up their status only through the get_sample_status_by_phone()
-- function below, keyed by phone number (easier for patients to remember
-- than a generated booking reference — they typed it in at booking time).

create table if not exists sample_tracking (
  id uuid primary key default gen_random_uuid(),
  booking_ref text,
  patient_name text not null,
  phone text not null,
  branch_name text,
  status text not null default 'تم تسجيل الطلب'
    check (status in (
      'تم تسجيل الطلب',
      'جاري السحب',
      'تم سحب العينة',
      'في المعمل - جاري التحليل',
      'جاهزة النتيجة',
      'تم التسليم'
    )),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sample_tracking_phone_idx on sample_tracking (phone);

alter table sample_tracking enable row level security;

drop policy if exists "authenticated read sample_tracking" on sample_tracking;
create policy "authenticated read sample_tracking" on sample_tracking
  for select using (auth.role() = 'authenticated');

drop policy if exists "authenticated write sample_tracking" on sample_tracking;
create policy "authenticated write sample_tracking" on sample_tracking
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Public lookup: exact phone match only (may return more than one visit),
-- no listing of unrelated patients, no other columns exposed.
create or replace function get_sample_status_by_phone(p_phone text)
returns table (booking_ref text, patient_name text, status text, updated_at timestamptz)
language sql security definer set search_path = public as $$
  select booking_ref, patient_name, status, updated_at
  from sample_tracking
  where phone = p_phone
  order by created_at desc;
$$;

grant execute on function get_sample_status_by_phone(text) to anon, authenticated;
