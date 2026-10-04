-- Trust Labs App — adds a specific branch name to visit_ratings.
-- Run this after visit_ratings_migration.sql (the table already exists in
-- production, so this is an ALTER, not a CREATE).
--
-- Without this, a "زيارة فرع" rating only says "branch" — not which one —
-- which makes it useless for the per-branch satisfaction breakdown the
-- admin dashboard needs.

alter table visit_ratings add column if not exists branch_name text; -- branch visits only; null for home visits
