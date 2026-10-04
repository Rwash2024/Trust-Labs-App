-- Trust Labs App — Complaints & feedback (public submission form)
-- Run this in the Supabase SQL editor after schema.sql + admin_policies.sql.
--
-- Anyone (anon) can submit a complaint/suggestion/inquiry, but only staff
-- (authenticated admin) can read, update the status, or delete entries —
-- same shape as sample_tracking, minus the phone-lookup RPC since patients
-- don't need to look these up themselves.

create table if not exists complaints (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  type text not null default 'شكوى'
    check (type in ('شكوى', 'اقتراح', 'استفسار')),
  branch_name text,
  rating smallint check (rating between 1 and 5),
  message text not null,
  status text not null default 'جديد'
    check (status in ('جديد', 'تحت المراجعة', 'تم الحل')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table complaints enable row level security;

drop policy if exists "public insert complaints" on complaints;
create policy "public insert complaints" on complaints
  for insert with check (true);

drop policy if exists "authenticated read complaints" on complaints;
create policy "authenticated read complaints" on complaints
  for select using (auth.role() = 'authenticated');

drop policy if exists "authenticated update complaints" on complaints;
create policy "authenticated update complaints" on complaints
  for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "authenticated delete complaints" on complaints;
create policy "authenticated delete complaints" on complaints
  for delete using (auth.role() = 'authenticated');
