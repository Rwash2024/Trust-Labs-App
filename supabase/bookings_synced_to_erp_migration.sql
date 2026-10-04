-- Trust Labs App — tracks whether a booking has been forwarded to Trust Lab Ops
-- (the internal ERP). Run after chat_bookings_migration.sql.

alter table bookings add column if not exists synced_to_erp boolean not null default false;
