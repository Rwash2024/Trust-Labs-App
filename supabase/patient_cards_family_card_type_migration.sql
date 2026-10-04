-- Trust Labs App — ties "أفراد العائلة" to the card actually sold as a
-- family card, instead of letting any (cheaper) personal card add unlimited
-- dependents for free. card_type is set once, when the code is generated for
-- printing — never something the patient can change after activation.
-- Run after patient_cards_family_and_photo_migration.sql.

alter table patient_cards
  add column if not exists card_type text not null default 'personal'
    check (card_type in ('personal', 'family'));

-- Family cards top out at 5 dependents (spouse + up to 4 kids/parents is the
-- common case) so one family card can't be stretched to cover an unlimited
-- number of people. Adjust here if the business decides on a different cap.
create or replace function add_family_member(
  p_card_code text,
  p_phone text,
  p_relation text,
  p_name text,
  p_gender text,
  p_dob date,
  p_blood_group text
)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_card patient_cards;
  v_count int;
begin
  select * into v_card from patient_cards
  where card_code = p_card_code and phone is not null and phone = p_phone;

  if not found then
    return 'unauthorized';
  end if;

  if v_card.card_type <> 'family' then
    return 'not_family_card';
  end if;

  select count(*) into v_count from family_members where card_code = p_card_code;
  if v_count >= 5 then
    return 'limit_reached';
  end if;

  insert into family_members (card_code, relation, name, gender, dob, blood_group)
  values (p_card_code, p_relation, p_name, p_gender, p_dob, p_blood_group);

  return 'added';
end;
$$;

grant execute on function add_family_member(text, text, text, text, text, date, text) to anon, authenticated;

-- get_patient_file needs to expose card_type so the app can hide "أفراد
-- العائلة" entirely for a personal card rather than let someone open it and
-- get rejected on add. Signature change (new OUT column) needs a drop first.
drop function if exists get_patient_file(text, text);

create or replace function get_patient_file(p_card_code text, p_phone text)
returns table (
  name text,
  gender text,
  dob date,
  marital_status text,
  blood_group text,
  address text,
  phone text,
  emergency_phone text,
  diagnoses text,
  current_medications text,
  investigation text,
  imaging text,
  photo_url text,
  card_type text
)
language sql security definer set search_path = public as $$
  select name, gender, dob, marital_status, blood_group, address, phone, emergency_phone,
         diagnoses, current_medications, investigation, imaging, photo_url, card_type
  from patient_cards
  where card_code = p_card_code and phone is not null and phone = p_phone;
$$;

grant execute on function get_patient_file(text, text) to anon, authenticated;

-- generate_patient_cards now takes the type of the batch being printed.
-- Example: select generate_patient_cards(500, 'personal'); then
--          select generate_patient_cards(200, 'family');
drop function if exists generate_patient_cards(int);

create or replace function generate_patient_cards(p_count int, p_type text default 'personal')
returns setof text
language plpgsql security definer set search_path = public as $$
declare
  v_code text;
  v_generated int := 0;
begin
  if p_type not in ('personal', 'family') then
    raise exception 'p_type must be personal or family';
  end if;

  while v_generated < p_count loop
    v_code := array_to_string(
      array(
        select substr('0123456789abcdefghijklmnopqrstuvwxyz', floor(random() * 36)::int + 1, 1)
        from generate_series(1, 6)
      ),
      ''
    );

    begin
      insert into patient_cards (card_code, card_type) values (v_code, p_type);
      v_generated := v_generated + 1;
      return next v_code;
    exception when unique_violation then
      null;
    end;
  end loop;
end;
$$;

-- Staff-only from here on (run from the SQL editor when printing a batch) —
-- a patient never needs to call this from the app, so it shouldn't be
-- reachable with just the anon key the way it was before this migration.
revoke execute on function generate_patient_cards(int, text) from public;
grant execute on function generate_patient_cards(int, text) to authenticated;
