-- In-branch QR campaign: one row per scan of a branch's code
-- (app.trustlabseg.com/?b=<branch slug>&p=<placement>), recorded by
-- src/lib/qrTracking.js at most once per device per branch+placement per day.
-- Shown in the admin's management report (sheet "مسح الأكواد").
--
-- Anyone can insert (patients aren't logged in); only admins can read.
-- The checks keep junk out: slugs and placements must look like the ones in
-- src/data/branchSlugs.js.
--
-- Run once in the Supabase SQL editor.

create table if not exists qr_scans (
  id uuid primary key default gen_random_uuid(),
  branch text not null check (branch ~ '^[a-z0-9-]{2,30}$'),
  placement text not null check (placement in ('counter', 'poster', 'table', 'receipt', 'exit')),
  path text check (length(path) <= 100),
  device_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists qr_scans_created_idx on qr_scans (created_at desc);

alter table qr_scans enable row level security;

drop policy if exists "public insert qr_scans" on qr_scans;
create policy "public insert qr_scans" on qr_scans
  for insert with check (true);

drop policy if exists "admin read qr_scans" on qr_scans;
create policy "admin read qr_scans" on qr_scans
  for select using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
