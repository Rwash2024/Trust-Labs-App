-- Trust Labs App — "قيّم زيارتك" (visit satisfaction survey)
-- Run this in the Supabase SQL editor after schema.sql + admin_policies.sql.
--
-- Public submission (like complaints), staff-only read. This is our own
-- durable record of every rating — independent of whether it's also forwarded
-- to Trust Lab Ops. Once Trust Lab Ops exposes a "submit survey" webhook
-- (their `receive-booking-webhook` only accepts bookings today), a server-side
-- Edge Function reads `synced_to_erp = false` rows, forwards them with the
-- x-webhook-secret header, and flips the flag — never done from the browser,
-- so the secret never reaches the client.

create table if not exists visit_ratings (
  id uuid primary key default gen_random_uuid(),
  visit_type text not null check (visit_type in ('branch', 'home')),
  overall smallint not null check (overall between 1 and 5),
  speed smallint check (speed between 1 and 5), -- branch visits only
  punctuality smallint check (punctuality between 1 and 5), -- home visits only
  staff smallint not null check (staff between 1 and 5),
  name text,
  phone text,
  chemist_name text, -- home visits only; typed by the patient, not looked up
  comment text,
  synced_to_erp boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists visit_ratings_created_at_idx on visit_ratings (created_at desc);

alter table visit_ratings enable row level security;

drop policy if exists "public insert visit_ratings" on visit_ratings;
create policy "public insert visit_ratings" on visit_ratings
  for insert with check (true);

drop policy if exists "authenticated read visit_ratings" on visit_ratings;
create policy "authenticated read visit_ratings" on visit_ratings
  for select using (auth.role() = 'authenticated');
