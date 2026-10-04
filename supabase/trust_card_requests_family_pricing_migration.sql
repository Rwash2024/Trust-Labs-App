-- Trust Labs App — lets a customer request either card type from the public
-- "اطلب كارت الثقة" form, priced from trust_card_pricing (the single source
-- of truth for both personal and family prices — see
-- trust_card_pricing_migration.sql) instead of the old single-price
-- app_settings.trust_card_price.
--
-- Run after trust_card_requests_migration.sql, trust_card_settings_migration.sql
-- and trust_card_pricing_migration.sql.

alter table trust_card_requests
  add column if not exists card_type text not null default 'personal'
    check (card_type in ('personal', 'family'));

-- Re-point the price-stamping trigger at trust_card_pricing. Still stamped
-- server-side at insert time — never trusted from the browser.
create or replace function set_trust_card_request_price()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  new.price := coalesce(
    (select case when new.card_type = 'family' then family_price else personal_price end
     from trust_card_pricing where id = 1),
    case when new.card_type = 'family' then 650 else 250 end
  );
  return new;
end;
$$;

-- Public price display — only the two prices the customer needs to see,
-- never personal_commission/family_commission (that's the branch's cut,
-- nobody else's business). trust_card_pricing itself stays staff-only.
create or replace function get_trust_card_prices()
returns table (personal_price numeric, family_price numeric)
language sql security definer set search_path = public as $$
  select personal_price, family_price from trust_card_pricing where id = 1;
$$;

grant execute on function get_trust_card_prices() to anon, authenticated;
