-- كارت الثقة: which branch each printed card was handed to, and when.
-- Staff (authenticated) already have full access to patient_cards via RLS, so
-- the admin page writes these two columns directly. "Which branch sold it"
-- on the activated-cards list = the branch the card was distributed to.
alter table public.patient_cards add column if not exists branch_name text;
alter table public.patient_cards add column if not exists distributed_at timestamptz;
create index if not exists patient_cards_branch_name_idx on public.patient_cards (branch_name);
