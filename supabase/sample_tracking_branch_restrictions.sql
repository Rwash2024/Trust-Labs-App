-- Trust Labs App — Branch accounts can add samples and move their status,
-- but only the site owner (admin) can edit patient details or delete a record.
-- Run this AFTER sample_tracking_migration.sql and branch_role_migration.sql.
--
-- RLS alone can't tell "changed the status" apart from "changed the name" on
-- the same UPDATE, so this splits enforcement two ways:
--   - DELETE is gated by RLS directly (admin only).
--   - UPDATE is allowed for any authenticated user at the RLS layer, but a
--     trigger blocks a non-admin from changing anything except status/notes.

drop policy if exists "authenticated write sample_tracking" on sample_tracking;

create policy "authenticated insert sample_tracking" on sample_tracking
  for insert with check (auth.role() = 'authenticated');

create policy "authenticated update sample_tracking" on sample_tracking
  for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "admin delete sample_tracking" on sample_tracking
  for delete using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create or replace function sample_tracking_guard_branch_edits()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' then
    return new;
  end if;

  if new.patient_name is distinct from old.patient_name
     or new.phone is distinct from old.phone
     or new.booking_ref is distinct from old.booking_ref
     or new.branch_name is distinct from old.branch_name then
    raise exception 'Only an admin account can edit patient details';
  end if;

  return new;
end;
$$;

drop trigger if exists sample_tracking_guard_branch_edits_trigger on sample_tracking;
create trigger sample_tracking_guard_branch_edits_trigger
  before update on sample_tracking
  for each row execute function sample_tracking_guard_branch_edits();
