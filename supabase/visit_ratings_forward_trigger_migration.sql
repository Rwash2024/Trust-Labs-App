-- Forwards every new booking and "قيّم زيارتك" rating to Trust Lab Ops (ERP)
-- by calling our edge functions from a Postgres trigger (pg_net).
--
-- These triggers were created directly in the Supabase dashboard; this file
-- records them so the setup can be rebuilt. It mirrors what is live.
--
-- BEFORE RUNNING: replace <FORWARD_WEBHOOK_SECRET> with the value of the
-- FORWARD_WEBHOOK_SECRET edge-function secret. Never commit the real value.
--
-- Requires the pg_net extension (Database > Extensions).

create or replace function public.forward_booking_to_erp()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  perform net.http_post(
    url := 'https://thghrkzeyfinbspaascz.supabase.co/functions/v1/forward-booking-to-erp',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-forward-secret', '<FORWARD_WEBHOOK_SECRET>'
    ),
    body := jsonb_build_object('type', 'INSERT', 'table', 'bookings', 'record', to_jsonb(NEW))
  );
  return NEW;
end;
$$;

drop trigger if exists trg_forward_booking_to_erp on public.bookings;
create trigger trg_forward_booking_to_erp
  after insert on public.bookings
  for each row execute function public.forward_booking_to_erp();

create or replace function public.forward_visit_rating_to_erp()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  perform net.http_post(
    url := 'https://thghrkzeyfinbspaascz.supabase.co/functions/v1/forward-visit-rating-to-erp',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-forward-secret', '<FORWARD_WEBHOOK_SECRET>'
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
