-- Complaints: the customer-service / branch account (any logged-in non-admin)
-- can read complaints and move their status, but only an admin can delete a
-- complaint or change what it says. Before this, any logged-in account could
-- delete or rewrite complaints — including ones about its own branch.
--
-- Same approach as sample_tracking_branch_restrictions.sql: RLS can't tell
-- "changed the status" from "changed the message" on one UPDATE, so a trigger
-- blocks non-admins from touching anything but status / updated_at.
--
-- Run once in the Supabase SQL editor.

drop policy if exists "authenticated delete complaints" on complaints;
drop policy if exists "admin delete complaints" on complaints;
create policy "admin delete complaints" on complaints
  for delete using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create or replace function complaints_guard_staff_edits()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' then
    return new;
  end if;

  if new.name is distinct from old.name
     or new.phone is distinct from old.phone
     or new.type is distinct from old.type
     or new.branch_name is distinct from old.branch_name
     or new.rating is distinct from old.rating
     or new.message is distinct from old.message
     or new.created_at is distinct from old.created_at then
    raise exception 'Only an admin account can edit a complaint''s details';
  end if;

  return new;
end;
$$;

drop trigger if exists complaints_guard_staff_edits_trigger on complaints;
create trigger complaints_guard_staff_edits_trigger
  before update on complaints
  for each row execute function complaints_guard_staff_edits();
