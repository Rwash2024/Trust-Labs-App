-- Trust Labs App — كارت الثقة pricing, editable from the admin dashboard
-- instead of living only in a chat conversation or a branch employee's head.
-- Single settings row (id = 1), same pattern as about_content.

create table if not exists trust_card_pricing (
  id int primary key default 1 check (id = 1),
  personal_price numeric not null default 250,
  personal_commission numeric not null default 50,
  family_price numeric not null default 650,
  family_commission numeric not null default 50,
  updated_at timestamptz not null default now()
);

insert into trust_card_pricing (id) values (1) on conflict (id) do nothing;

alter table trust_card_pricing enable row level security;

drop policy if exists "authenticated read trust_card_pricing" on trust_card_pricing;
create policy "authenticated read trust_card_pricing" on trust_card_pricing
  for select using (auth.role() = 'authenticated');

drop policy if exists "authenticated write trust_card_pricing" on trust_card_pricing;
create policy "authenticated write trust_card_pricing" on trust_card_pricing
  for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
