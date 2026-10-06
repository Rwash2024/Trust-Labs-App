-- Trust Labs App — spam / abuse protection for the public forms.
-- Run in the Supabase SQL Editor. Safe to re-run.
--
-- Why in the database: the anon key ships inside the app, so anyone can call
-- the REST API directly and skip every check in the UI. Triggers here apply
-- no matter how a row arrives.
--
-- What it does
--   1. BEFORE INSERT rate limits on the public tables:
--        bookings, complaints, visit_ratings, trust_card_requests, qr_scans
--      - per phone (per device for qr_scans) over a rolling window, and
--      - a global cap per hour as an emergency brake. It only trips under
--        flooding; real traffic is far below it.
--      A blocked insert raises an Arabic message the form shows as-is.
--      Because the ERP forward trigger is AFTER INSERT, blocked rows are
--      never forwarded to Trust Lab Ops either.
--   2. Length caps on free-text columns (NOT VALID = applies to new rows only,
--      so existing data can never make this migration fail).
--   3. A small table the chat-assistant edge function uses to rate-limit per IP.
--
-- Tune the numbers in the trigger arguments below:
--   enforce_insert_rate_limit(key_column, per_key_max, per_key_minutes,
--                             global_max, global_minutes)

-- ---------------------------------------------------------------------------
-- 1. Rate limiting
-- ---------------------------------------------------------------------------

-- SECURITY DEFINER so it can count rows even though anon has no SELECT on
-- these tables (RLS). Reads only created_at and the key column.
create or replace function public.enforce_insert_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  key_col text := tg_argv[0];
  per_key_max int := tg_argv[1]::int;
  per_key_minutes int := tg_argv[2]::int;
  global_max int := tg_argv[3]::int;
  global_minutes int := tg_argv[4]::int;
  key_val text;
  n int;
begin
  if key_col <> '' then
    key_val := to_jsonb(new) ->> key_col;
    if key_val is not null and key_val <> '' then
      execute format(
        'select count(*) from %I.%I where %I::text = $1 and created_at > now() - make_interval(mins => $2)',
        tg_table_schema, tg_table_name, key_col
      ) into n using key_val, per_key_minutes;
      if n >= per_key_max then
        raise exception 'تم تجاوز الحد المسموح للإرسال، حاول بعد قليل أو كلّم الخط الساخن 16183'
          using errcode = 'P0001', hint = 'rate_limited';
      end if;
    end if;
  end if;

  execute format(
    'select count(*) from %I.%I where created_at > now() - make_interval(mins => $1)',
    tg_table_schema, tg_table_name
  ) into n using global_minutes;
  if n >= global_max then
    raise exception 'الخدمة مشغولة حاليًا، حاول بعد شوية أو كلّم الخط الساخن 16183'
      using errcode = 'P0001', hint = 'rate_limited_global';
  end if;

  return new;
end;
$$;

-- Lookups the triggers rely on.
create index if not exists bookings_phone_created_idx on bookings (phone, created_at desc);
create index if not exists complaints_phone_created_idx on complaints (phone, created_at desc);
create index if not exists visit_ratings_phone_created_idx on visit_ratings (phone, created_at desc);
create index if not exists trust_card_requests_phone_created_idx on trust_card_requests (phone, created_at desc);
create index if not exists qr_scans_device_created_idx on qr_scans (device_id, created_at desc);

-- bookings: 5 per phone per day (a family can book a few times), 300/hour overall
drop trigger if exists bookings_rate_limit on bookings;
create trigger bookings_rate_limit before insert on bookings
  for each row execute function public.enforce_insert_rate_limit('phone', '5', '1440', '300', '60');

-- complaints: 5 per phone per day, 100/hour overall
drop trigger if exists complaints_rate_limit on complaints;
create trigger complaints_rate_limit before insert on complaints
  for each row execute function public.enforce_insert_rate_limit('phone', '5', '1440', '100', '60');

-- visit ratings: phone is optional (skipped when empty). 3 per phone per day, 200/hour overall
drop trigger if exists visit_ratings_rate_limit on visit_ratings;
create trigger visit_ratings_rate_limit before insert on visit_ratings
  for each row execute function public.enforce_insert_rate_limit('phone', '3', '1440', '200', '60');

-- Trust Card orders: 5 per phone per day, 100/hour overall
drop trigger if exists trust_card_requests_rate_limit on trust_card_requests;
create trigger trust_card_requests_rate_limit before insert on trust_card_requests
  for each row execute function public.enforce_insert_rate_limit('phone', '5', '1440', '100', '60');

-- QR scans: 60 per device per day (client already dedupes per branch+placement+day), 3000/hour overall
drop trigger if exists qr_scans_rate_limit on qr_scans;
create trigger qr_scans_rate_limit before insert on qr_scans
  for each row execute function public.enforce_insert_rate_limit('device_id', '60', '1440', '3000', '60');

-- ---------------------------------------------------------------------------
-- 2. Length caps on free text (new rows only)
-- ---------------------------------------------------------------------------

alter table bookings drop constraint if exists bookings_text_length_chk;
alter table bookings add constraint bookings_text_length_chk check (
  char_length(name) <= 120 and char_length(phone) <= 20
  and char_length(coalesce(address, '')) <= 300 and char_length(coalesce(notes, '')) <= 1000
) not valid;

alter table complaints drop constraint if exists complaints_text_length_chk;
alter table complaints add constraint complaints_text_length_chk check (
  char_length(name) <= 120 and char_length(phone) <= 20 and char_length(message) <= 2000
) not valid;

alter table visit_ratings drop constraint if exists visit_ratings_text_length_chk;
alter table visit_ratings add constraint visit_ratings_text_length_chk check (
  char_length(coalesce(name, '')) <= 120 and char_length(coalesce(phone, '')) <= 20
  and char_length(coalesce(comment, '')) <= 1000
) not valid;

alter table trust_card_requests drop constraint if exists trust_card_requests_text_length_chk;
alter table trust_card_requests add constraint trust_card_requests_text_length_chk check (
  char_length(buyer_name) <= 120 and char_length(card_holder_name) <= 120
) not valid;

-- ---------------------------------------------------------------------------
-- 3. Per-IP limiter state for the chat-assistant edge function
-- ---------------------------------------------------------------------------
-- Only a SHA-256 hash of the IP is stored, and rows are deleted after a day.
-- RLS is on with no policies: only the service role (the edge function) can
-- touch it.

create table if not exists chat_rate_limits (
  ip_hash text not null,
  created_at timestamptz not null default now()
);
create index if not exists chat_rate_limits_ip_created_idx on chat_rate_limits (ip_hash, created_at desc);
alter table chat_rate_limits enable row level security;
