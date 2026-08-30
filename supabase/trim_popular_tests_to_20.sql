-- Trust Labs App — trim the "تحاليل" list on the Packages page from 30 to 20 tests.
-- Keeps the 20 cheapest-first curated tests as `popular = true`; unmarks the other 10.
-- Run once in the Supabase SQL Editor.

update tests
set popular = false
where code in ('13704', '12539', '12957', '13110', '18962', '19424', '12589', '3483', '3501', '17237');
