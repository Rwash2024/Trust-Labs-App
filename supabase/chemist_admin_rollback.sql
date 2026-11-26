-- Undo chemist_admin_migration.sql. Restores get_trip_by_token without the
-- photo field by re-running its definition from chemist_tracking_migration.sql
-- (copy that function block here before running), then:

-- Photos: empty the bucket from the dashboard (Storage > chemist-photos) first;
-- a bucket with objects cannot be dropped.
delete from storage.buckets where id = 'chemist-photos';

-- Archived chemists would become visible (and stay banned) after this.
alter table public.chemists drop column if exists archived_at;
alter table public.chemists drop column if exists photo_path;
