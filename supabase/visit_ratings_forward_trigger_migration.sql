-- Trust Labs App — forwards every new visit_ratings row to Trust Lab Ops (ERP)
-- by calling the forward-visit-rating-to-erp Edge Function via pg_net.
-- Mirrors the bookings trigger exactly (same pattern, same reason: the
-- Supabase dashboard's "Database Webhooks" UI is broken on this project).
--
-- Run this in the Supabase SQL Editor after:
--   1. visit_ratings_migration.sql + visit_ratings_branch_column_migration.sql
--   2. `supabase functions deploy forward-visit-rating-to-erp --no-verify-jwt`
--   3. secrets set: TRUST_LAB_OPS_SURVEY_WEBHOOK_URL, TRUST_LAB_OPS_WEBHOOK_SECRET
--      (reuses the same value as bookings), FORWARD_WEBHOOK_SECRET (same value below)

create extension if not exists pg_net with schema extensions;

create or replace function public.forward_visit_rating_to_erp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform net.http_post(
    url := 'https://thghrkzeyfinbspaascz.supabase.co/functions/v1/forward-visit-rating-to-erp',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-forward-secret', 'c8df7cd1002eeb68a8b67e00996e644f38824684d5d8e5c4'
    ),
    body := jsonb_build_object('type', 'INSERT', 'record', to_jsonb(new))
  );
  return new;
end;
$$;

drop trigger if exists visit_ratings_forward_to_erp on public.visit_ratings;
create trigger visit_ratings_forward_to_erp
  after insert on public.visit_ratings
  for each row execute function public.forward_visit_rating_to_erp();
