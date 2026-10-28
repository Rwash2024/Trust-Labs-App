-- Trust Card orders: the customer-service / branch account (any logged-in
-- non-admin) can read orders and move their status (جديد → تم التواصل → ...)
-- so the call center can follow up with each patient. Only an admin can delete
-- an order or change what it says.
--
-- Before this, trust_card_requests was admin-only (trust_card_requests_migration.sql).
-- Same approach as complaints_staff_permissions_migration.sql: RLS can't tell
-- "changed the status" from "changed the details" on one UPDATE, so a trigger
-- blocks non-admins from touching anything but status / updated_at.
--
-- Run once in the Supabase SQL editor.

drop policy if exists "staff read trust_card_requests" on trust_card_requests;
create policy "staff read trust_card_requests" on trust_card_requests
  for select using (auth.role() = 'authenticated');

drop policy if exists "staff update trust_card_requests" on trust_card_requests;
create policy "staff update trust_card_requests" on trust_card_requests
  for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create or replace function trust_card_requests_guard_staff_edits()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' then
    return new;
  end if;

  if new.for_whom is distinct from old.for_whom
     or new.buyer_name is distinct from old.buyer_name
     or new.card_holder_name is distinct from old.card_holder_name
     or new.relationship is distinct from old.relationship
     or new.phone is distinct from old.phone
     or new.card_type is distinct from old.card_type
     or new.price is distinct from old.price
     or new.created_at is distinct from old.created_at then
    raise exception 'Only an admin account can edit a Trust Card order''s details';
  end if;

  return new;
end;
$$;

drop trigger if exists trust_card_requests_guard_staff_edits_trigger on trust_card_requests;
create trigger trust_card_requests_guard_staff_edits_trigger
  before update on trust_card_requests
  for each row execute function trust_card_requests_guard_staff_edits();
