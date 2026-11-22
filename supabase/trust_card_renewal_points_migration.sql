-- Trust Labs App — نقاط التجديد لحاملي كارت الثقة  (DRAFT — not run yet)
--
-- What it is: a card holder earns points on every PAID branch visit during
-- their membership year, and spends them only as a discount on renewing the
-- card. Points are not a discount on tests (the card already gives 25%), so
-- there is no double discount on a visit; their only job is renewal.
--
-- Why staff record the visit instead of the app or the patient:
--   * The app has no feed of paid invoices from the ERP (bookings go one way,
--     see functions/forward-booking-to-erp). A booking is not a paid visit.
--   * Patient login is card_code + phone with no OTP (patient_cards_migration
--     notes this). Anything worth money must not be patient-writable.
--   So branch staff (authenticated) enter the invoice number + amount paid.
--   invoice_no is unique, every row keeps the staff user id and branch, and a
--   card can earn at most once per day — enough to audit abuse.
--   When the ERP can push paid invoices, an Edge Function calls the same
--   record function and the staff step goes away.
--
-- Rules (all editable in renewal_points_settings, defaults are placeholders
-- to decide on):
--   * 1 point per 10 EGP actually paid (after the 25% discount).
--   * 1 point = 1 EGP off the renewal price.
--   * Points can cover at most 50% of the renewal price.
--   * Points belong to one membership year. At renewal, what is not used
--     expires. Renewal is allowed up to 30 days after expires_at.
--
-- Run after patient_cards_expiry_migration.sql, patient_cards_family_card_type_migration.sql
-- and trust_card_pricing_migration.sql.

create table if not exists renewal_points_settings (
  id int primary key default 1 check (id = 1),
  enabled boolean not null default true,
  egp_per_point numeric not null default 10 check (egp_per_point > 0),
  point_value_egp numeric not null default 1 check (point_value_egp >= 0),
  max_redeem_pct numeric not null default 50 check (max_redeem_pct between 0 and 100),
  renewal_grace_days int not null default 30 check (renewal_grace_days >= 0),
  updated_at timestamptz not null default now()
);

insert into renewal_points_settings (id) values (1) on conflict (id) do nothing;

alter table renewal_points_settings enable row level security;

drop policy if exists "authenticated read renewal_points_settings" on renewal_points_settings;
create policy "authenticated read renewal_points_settings" on renewal_points_settings
  for select using (auth.role() = 'authenticated');

drop policy if exists "admin write renewal_points_settings" on renewal_points_settings;
create policy "admin write renewal_points_settings" on renewal_points_settings
  for update using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Append-only ledger. Balance = sum(points) for the card's current period.
create table if not exists renewal_points_ledger (
  id uuid primary key default gen_random_uuid(),
  card_code text not null references patient_cards(card_code),
  period_start timestamptz not null, -- the card's activated/renewed-at for this membership year
  kind text not null check (kind in ('earn', 'redeem', 'expire', 'adjust')),
  points int not null,
  invoice_no text,
  amount_paid numeric check (amount_paid is null or amount_paid > 0),
  branch text,
  note text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  check ((kind = 'earn') = (invoice_no is not null and amount_paid is not null)),
  check ((kind = 'earn' and points >= 0) or (kind in ('redeem', 'expire') and points <= 0) or kind = 'adjust')
);

create unique index if not exists renewal_points_invoice_uniq
  on renewal_points_ledger (invoice_no) where kind = 'earn';
create index if not exists renewal_points_card_idx
  on renewal_points_ledger (card_code, period_start);

alter table renewal_points_ledger enable row level security;

-- Staff read; no direct writes — every write goes through the functions below.
drop policy if exists "authenticated read renewal_points_ledger" on renewal_points_ledger;
create policy "authenticated read renewal_points_ledger" on renewal_points_ledger
  for select using (auth.role() = 'authenticated');

-- The membership year a card is in now = expires_at - 1 year.
create or replace function _card_period_start(p_expires_at timestamptz)
returns timestamptz language sql immutable as $$
  select p_expires_at - interval '1 year'
$$;

create or replace function _card_points_balance(p_card_code text, p_period_start timestamptz)
returns int language sql stable security definer set search_path = public as $$
  select coalesce(sum(points), 0)::int from renewal_points_ledger
  where card_code = p_card_code and period_start = p_period_start
$$;

-- Staff: record a paid visit and award points.
create or replace function record_card_visit_points(
  p_card_code text,
  p_invoice_no text,
  p_amount_paid numeric,
  p_branch text
)
returns json
language plpgsql security definer set search_path = public as $$
declare
  v_card patient_cards;
  v_set renewal_points_settings;
  v_points int;
  v_period timestamptz;
begin
  if auth.role() <> 'authenticated' then
    return json_build_object('status', 'unauthorized');
  end if;

  select * into v_set from renewal_points_settings where id = 1;
  if not v_set.enabled then
    return json_build_object('status', 'disabled');
  end if;

  if coalesce(trim(p_invoice_no), '') = '' or p_amount_paid is null or p_amount_paid <= 0 then
    return json_build_object('status', 'invalid_input');
  end if;

  select * into v_card from patient_cards where card_code = p_card_code for update;
  if not found or v_card.activated_at is null then
    return json_build_object('status', 'card_not_active');
  end if;
  if now() > v_card.expires_at then
    return json_build_object('status', 'card_expired');
  end if;

  v_period := _card_period_start(v_card.expires_at);

  if exists (
    select 1 from renewal_points_ledger
    where card_code = p_card_code and kind = 'earn'
      and created_at >= date_trunc('day', now() at time zone 'Africa/Cairo') at time zone 'Africa/Cairo'
  ) then
    return json_build_object('status', 'already_earned_today');
  end if;

  v_points := floor(p_amount_paid / v_set.egp_per_point)::int;

  begin
    insert into renewal_points_ledger (card_code, period_start, kind, points, invoice_no, amount_paid, branch)
    values (p_card_code, v_period, 'earn', v_points, trim(p_invoice_no), p_amount_paid, p_branch);
  exception when unique_violation then
    return json_build_object('status', 'duplicate_invoice');
  end;

  return json_build_object(
    'status', 'ok',
    'points', v_points,
    'balance', _card_points_balance(p_card_code, v_period)
  );
end;
$$;

-- Patient: see balance + what it is worth at renewal (same card_code + phone check as get_patient_file).
create or replace function get_renewal_points(p_card_code text, p_phone text)
returns json
language plpgsql security definer set search_path = public as $$
declare
  v_card patient_cards;
  v_set renewal_points_settings;
  v_price numeric;
  v_balance int;
  v_value numeric;
begin
  select * into v_card from patient_cards
  where card_code = p_card_code and phone is not null and phone = p_phone;
  if not found then
    return json_build_object('status', 'unauthorized');
  end if;

  select * into v_set from renewal_points_settings where id = 1;
  select case when v_card.card_type = 'family' then family_price else personal_price end
    into v_price from trust_card_pricing where id = 1;

  v_balance := _card_points_balance(p_card_code, _card_period_start(v_card.expires_at));
  v_value := least(v_balance * v_set.point_value_egp, v_price * v_set.max_redeem_pct / 100);

  return json_build_object(
    'status', 'ok',
    'enabled', v_set.enabled,
    'balance', v_balance,
    'renewal_price', v_price,
    'renewal_discount', v_value,
    'expires_at', v_card.expires_at
  );
end;
$$;

-- Admin: renew a card for another year, optionally spending points.
-- Leftover points of the closing year are written off as 'expire'.
create or replace function renew_patient_card(p_card_code text, p_use_points boolean default true)
returns json
language plpgsql security definer set search_path = public as $$
declare
  v_card patient_cards;
  v_set renewal_points_settings;
  v_price numeric;
  v_period timestamptz;
  v_balance int;
  v_redeem_pts int := 0;
  v_discount numeric := 0;
  v_new_expiry timestamptz;
begin
  if (auth.jwt() -> 'app_metadata' ->> 'role') is distinct from 'admin' then
    return json_build_object('status', 'unauthorized');
  end if;

  select * into v_card from patient_cards where card_code = p_card_code for update;
  if not found or v_card.activated_at is null then
    return json_build_object('status', 'card_not_active');
  end if;

  select * into v_set from renewal_points_settings where id = 1;
  if now() > v_card.expires_at + make_interval(days => v_set.renewal_grace_days) then
    return json_build_object('status', 'grace_period_over');
  end if;

  select case when v_card.card_type = 'family' then family_price else personal_price end
    into v_price from trust_card_pricing where id = 1;

  v_period := _card_period_start(v_card.expires_at);
  v_balance := _card_points_balance(p_card_code, v_period);

  if p_use_points and v_set.enabled and v_balance > 0 and v_set.point_value_egp > 0 then
    v_discount := least(v_balance * v_set.point_value_egp, v_price * v_set.max_redeem_pct / 100);
    v_redeem_pts := ceil(v_discount / v_set.point_value_egp)::int;
    v_redeem_pts := least(v_redeem_pts, v_balance);
    insert into renewal_points_ledger (card_code, period_start, kind, points, note)
    values (p_card_code, v_period, 'redeem', -v_redeem_pts, 'renewal');
  end if;

  if v_balance - v_redeem_pts > 0 then
    insert into renewal_points_ledger (card_code, period_start, kind, points, note)
    values (p_card_code, v_period, 'expire', -(v_balance - v_redeem_pts), 'unused at renewal');
  end if;

  -- Early renewal keeps the remaining days; late (in grace) restarts from today.
  v_new_expiry := greatest(v_card.expires_at, now()) + interval '1 year';
  update patient_cards set expires_at = v_new_expiry, updated_at = now()
  where card_code = p_card_code;

  return json_build_object(
    'status', 'ok',
    'renewal_price', v_price,
    'points_used', v_redeem_pts,
    'discount', v_discount,
    'amount_due', v_price - v_discount,
    'expires_at', v_new_expiry
  );
end;
$$;

revoke all on function record_card_visit_points(text, text, numeric, text) from public, anon;
grant execute on function record_card_visit_points(text, text, numeric, text) to authenticated;

revoke all on function renew_patient_card(text, boolean) from public, anon;
grant execute on function renew_patient_card(text, boolean) to authenticated;

grant execute on function get_renewal_points(text, text) to anon, authenticated;

revoke all on function _card_points_balance(text, timestamptz) from public, anon, authenticated;
