-- Trust Labs App — make the Trust Card profile photos private.
-- Run this in the Supabase SQL Editor AFTER the get-patient-report-url edge
-- function (with the 'photo' kind) and the matching front-end are deployed.
--
-- Why: patient-photos was a public bucket with a public SELECT policy, so
-- anyone holding the (public) anon key could LIST every file name in it, not
-- just guess a URL. Profile photos of patients are health-adjacent data.
--
-- After this: the bucket is not publicly readable. The app shows a photo
-- through a 5-minute signed URL that get-patient-report-url mints only after
-- card_code + phone are verified. Staff (authenticated) can still read.
-- Anonymous upload stays (activation happens before the patient has any other
-- credential) but is now capped to small image files.

update storage.buckets
set public = false,
    file_size_limit = 10485760, -- 10 MB
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
where id = 'patient-photos';

drop policy if exists "anyone reads patient photos" on storage.objects;

drop policy if exists "staff read patient photos" on storage.objects;
create policy "staff read patient photos" on storage.objects
  for select to authenticated
  using (bucket_id = 'patient-photos');

-- Older rows stored the full public URL; keep just the storage path. (The edge
-- function accepts both, so this is tidy-up, not a requirement.)
update patient_cards
set photo_url = regexp_replace(photo_url, '^.*/patient-photos/', '')
where photo_url like 'http%';

update family_members
set photo_url = regexp_replace(photo_url, '^.*/patient-photos/', '')
where photo_url like 'http%';
