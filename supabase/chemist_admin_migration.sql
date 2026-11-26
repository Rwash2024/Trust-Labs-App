-- Trust Labs App — chemist admin follow-up (2026-11-26).
-- Runs AFTER chemist_tracking_migration.sql. Adds what the admin asked for in
-- the «الكيميائيين» tab: a photo per chemist (shown to the customer on the
-- tracking page too), editing, and deleting.
--
-- Deleting: a chemist with no visit history is removed for good (by the
-- manage-chemist edge function). One WITH history is archived instead —
-- archived_at set, account banned, hidden from the tab — so old bookings and
-- pings keep pointing at a real row.
--
-- Photos live in the public bucket chemist-photos under <chemist id>/<uuid>.jpg.
-- Public = readable by URL only (no listing policy exists); only the edge
-- function (service role) writes there. The customer page gets the path from
-- get_trip_by_token.
--
-- Rollback: supabase/chemist_admin_rollback.sql

alter table public.chemists add column if not exists photo_path text;
alter table public.chemists add column if not exists archived_at timestamptz;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chemist-photos', 'chemist-photos', true, 1048576, array['image/jpeg'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- get_trip_by_token: same as before, plus chemist_photo (storage path or null).
create or replace function public.get_trip_by_token(p_token text)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_b public.bookings%rowtype;
  v_first text;
  v_photo text;
  v_last json;
begin
  if p_token is null or length(p_token) <> 32 then
    return null;
  end if;

  select * into v_b from public.bookings b where b.track_token = p_token;
  if not found
     or v_b.status = 'ملغي'
     or v_b.trip_status is null
     or v_b.trip_status = 'cancelled'
     or (v_b.trip_status = 'arrived' and v_b.trip_arrived_at < now() - interval '24 hours') then
    return null;
  end if;

  select nullif((regexp_split_to_array(btrim(c.name), '\s+'))[1], ''), c.photo_path
  into v_first, v_photo
  from public.chemists c
  where c.id = v_b.assigned_chemist_id;

  if v_b.trip_status = 'on_way' then
    select json_build_object('lat', cp.lat, 'lng', cp.lng, 'at', cp.at)
    into v_last
    from public.chemist_pings cp
    where cp.booking_id = v_b.id
    order by cp.at desc, cp.id desc
    limit 1;
  end if;

  return json_build_object(
    'status', v_b.trip_status,
    'chemist_first_name', v_first,
    'chemist_photo', v_photo,
    'started_at', v_b.trip_started_at,
    'arrived_at', v_b.trip_arrived_at,
    'preferred_date', v_b.preferred_date,
    'dest', case
      when v_b.location_lat is not null and v_b.location_lng is not null
        then json_build_object('lat', v_b.location_lat, 'lng', v_b.location_lng)
    end,
    'last', v_last
  );
end;
$$;

revoke execute on function public.get_trip_by_token(text) from public;
grant execute on function public.get_trip_by_token(text) to anon, authenticated;
