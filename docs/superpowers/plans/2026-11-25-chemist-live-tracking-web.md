# Chemist Live Tracking (Plan 1 of 2: database + web) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Call center assigns a chemist to a home visit (including phone bookings) and sends a secret tracking link. The chemist shares location from a web page during the trip only. The customer watches the chemist on a map, and staff watch every live visit.

**Architecture:** One Supabase migration adds `chemists`, `chemist_pings`, trip columns on `bookings`, a `chemist` role lockout, and security-definer RPCs. All writes go through those RPCs. The React app gets three surfaces: `/chemist` (chemist), `/t/:token` (public customer page, polling an anon RPC), and staff additions in `BookingsTab` plus two new tabs (live map with realtime, chemists admin). Location capture sits behind a small `locationSource` interface, so Plan 2 (Android Capacitor app with background geolocation) can swap in a native source without touching screens.

**Tech Stack:** React 19, react-router-dom 7, Vite 8, Supabase (Postgres RLS + RPC + Realtime + Edge Functions/Deno), Leaflet 1.9.4 with OpenStreetMap tiles, `node:test` for unit tests.

**Spec:** `docs/superpowers/specs/2026-11-25-chemist-live-tracking-design.md`

**Out of this plan (Plan 2, written after Plan 1 is on trial):** the `chemist-app/` Capacitor Android wrapper, the native background-geolocation `locationSource`, the signed APK, and the Arabic install guide.

## Global Constraints

- Arabic RTL, simple Egyptian Arabic, light tone, few emojis.
- Base text ≥16px; customer page 18px; touch targets ≥48px.
- Every status shows **icon + word**, never colour alone. Status changes are announced via `role="status"`.
- Brand colours come from CSS vars (`--color-primary` #39B76E, `--color-primary-darker` #1F6B3D, `--color-primary-light` #E9F8EF). Amber for attention, grey for not started. No raw hex in components except the map marker helper.
- Location is recorded **only** while a booking's `trip_status = 'on_way'`, and the database enforces it.
- Tracking key = random token of ≥32 url-safe chars; never `booking_ref` or phone alone.
- The customer page never shows the patient's phone, address, or tests, nor the chemist's phone. The call button is `tel:16183`.
- Chemist login = phone + password. Internally the email is `<normalized 01XXXXXXXXX>@chemist.local`.
- The `chemist` role can read no patient table directly. It uses RPCs only.
- `source = 'call_center'` bookings are not forwarded to the ERP.
- Leaflet pinned `"leaflet": "1.9.4"`, lazy-loaded; tiles `https://tile.openstreetmap.org/{z}/{x}/{y}.png` with OSM attribution.
- Polling customer page every 15 s while the page is visible. Browser pings every 20–30 s, and the server rejects pings <10 s apart.
- Thresholds: ETA shown only if a destination exists and the last ping is <3 min old; "stale" note on customer page when the ping is >3 min old; staff «التتبع متوقف» at 5 min of silence; «رحلة طويلة» when on the way >60 min; token readable until 24 h after `trip_arrived_at`.
- ETA = haversine × 1.4 ÷ 25 km/h, shown as a 5-minute range (e.g. «حوالي 10–15 دقيقة»).
- Each live step (apply migration, deploy edge function, deploy to Vercel production) needs Mohamed's explicit OK first.

## Review Focus

1. **Customer opens the link before the chemist starts.** Expect a calm waiting state («هنبلّغك لما الكيميائي يتحرك»), no map, no error. Test in Task 3 (`get_trip_by_token` on `assigned`) and Task 8 (render).
2. **Location permission denied or GPS failing on the chemist phone.** Expect a visible red warning on the trip screen; the trip stays `on_way`. Test in Task 7 (`tripScreenWarning`).
3. **Booking without a map pin (most phone bookings).** Expect the map to show only the chemist and no ETA chip. Test in Task 1 (`etaRange` returns null) and Task 3 (destination null).
4. **Phone typed in different shapes** (`+20 10…`, `010…`, Arabic digits) for chemist login, `find_trip`, and `wa.me`. All must normalise the same way. Test in Task 1 (`normalizeEgyptPhone`, `chemistEmailFromPhone`, `whatsAppUrl`) and Task 3 (`find_trip` with `+20`).
5. **Chemist reloads or reopens the page mid-trip.** Expect it to resume tracking from `trip_status`, not show «أنا في الطريق» again. Test in Task 7 (`visitAction` for `on_way`).

---

### Task 1: Pure tracking logic + test script

**Files:**
- Create: `src/lib/chemistTracking.js`
- Test: `src/lib/chemistTracking.test.js`
- Modify: `package.json` (add `"test": "node --test"`)

**Interfaces:**
- Produces:
  - `haversineM(a: {lat,lng}, b: {lat,lng}) -> number`
  - `etaRange(from: {lat,lng}|null, to: {lat,lng}|null) -> {min:number,max:number}|null`: minutes rounded to 5-min bounds; `min ≥ 5`.
  - `minutesSince(iso: string, now: Date) -> number` (floored)
  - `normalizeEgyptPhone(input: string) -> string|null`: returns `01XXXXXXXXX` or null. Reuse `normalizeDigits` from `src/lib/phone.js`.
  - `chemistEmailFromPhone(input) -> string|null`
  - `trackUrl(origin: string, token: string) -> string`: `${origin}/t/${token}`
  - `whatsAppUrl(phone: string, link: string, chemistFirstName?: string) -> string|null`: `https://wa.me/20<10 digits>?text=<encoded>`
  - `attentionFlags(visit: {trip_status, trip_started_at, last_ping_at, preferred_date}, now: Date) -> Array<'stale'|'long'|'not_started'>`
  - `attentionRank(flags) -> number`: lower = more urgent; `stale` < `long` < `not_started` < none.

- [ ] **Step 1: Write failing tests**

```js
test('etaRange: 3 km straight line -> 10..15', () => {
  // two points ~3000 m apart; 3 km*1.4/25kmh = 10.08 min
  assert.deepEqual(etaRange(P0, P3km), { min: 10, max: 15 })
})
test('etaRange: null destination -> null', () => assert.equal(etaRange(P0, null), null))
test('etaRange: very close -> 5..10 floor', () => assert.deepEqual(etaRange(P0, P0), { min: 5, max: 10 }))
test('normalizeEgyptPhone variants', () => {
  for (const v of ['01012345678', '+201012345678', '00201012345678', '٠١٠١٢٣٤٥٦٧٨', '010 1234 5678'])
    assert.equal(normalizeEgyptPhone(v), '01012345678')
  assert.equal(normalizeEgyptPhone('12345'), null)
})
test('chemistEmailFromPhone', () => assert.equal(chemistEmailFromPhone('+20 101 234 5678'), '01012345678@chemist.local'))
test('whatsAppUrl encodes Arabic text and uses 20 prefix', () => {
  const u = whatsAppUrl('01012345678', 'https://x/t/abc', 'أحمد')
  assert.ok(u.startsWith('https://wa.me/201012345678?text='))
  assert.ok(decodeURIComponent(u.split('text=')[1]).includes('https://x/t/abc'))
})
test('attentionFlags', () => {
  const now = new Date('2026-11-25T10:00:00Z')
  assert.deepEqual(attentionFlags({ trip_status: 'on_way', trip_started_at: '2026-11-25T09:50:00Z', last_ping_at: '2026-11-25T09:54:00Z' }, now), ['stale'])
  assert.deepEqual(attentionFlags({ trip_status: 'on_way', trip_started_at: '2026-11-25T08:50:00Z', last_ping_at: '2026-11-25T09:59:30Z' }, now), ['long'])
  assert.deepEqual(attentionFlags({ trip_status: 'assigned', preferred_date: '2026-11-25' }, now), ['not_started'])
  assert.deepEqual(attentionFlags({ trip_status: 'assigned', preferred_date: '2026-11-26' }, now), [])
})
```
The `whatsAppUrl` message text is fixed copy: `أهلاً 👋 الكيميائي {name} اتحدد لزيارتك من معامل ترست. تقدر تتابع وصوله من اللينك ده: {link}`. When there's no name, drop `{name} `.

- [ ] **Step 2: Run `npm test`.** Expected: FAIL, the module is not found.
- [ ] **Step 3: Implement `src/lib/chemistTracking.js`** with the signatures above. "Today" in `not_started` compares `preferred_date` with the Cairo local date (`Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Cairo'})`).
- [ ] **Step 4: Run `npm test`.** Expected: all pass (including the existing `recaptcha.test.js`).
- [ ] **Step 5: Commit** `feat(tracking): pure ETA/phone/attention helpers + npm test`.

---

### Task 2: Migration part 1: schema, chemist lockout, guard, retention

**Files:**
- Create: `supabase/chemist_tracking_migration.sql` (sections 1–4 here; RPCs are appended in Task 3)
- Test: `supabase/tests/chemist_tracking_test.sql` (BEGIN … ROLLBACK script; this task's section)

**Interfaces:**
- Produces:
  - tables `public.chemists(id uuid pk references auth.users on delete cascade, name text not null, phone text not null unique, active boolean not null default true, created_at timestamptz default now())`
  - `public.chemist_pings(id bigserial pk, booking_id uuid not null references bookings(id) on delete cascade, chemist_id uuid not null references chemists(id), lat double precision not null, lng double precision not null, accuracy_m real, at timestamptz not null default now())` with index `(booking_id, at desc)`
  - `bookings` columns: `assigned_chemist_id uuid references chemists(id)`, `track_token text unique`, `trip_status text check (trip_status in ('assigned','on_way','arrived','cancelled'))`, `trip_started_at timestamptz`, `trip_arrived_at timestamptz`
  - `bookings.source` check (if one exists) widened to include `'call_center'`
  - helpers `public.app_role() returns text` (`coalesce(auth.jwt()->'app_metadata'->>'role','')`), `public.is_chemist()`, `public.is_staff()` (authenticated and `app_role() in ('', 'admin')`)

- [ ] **Step 1: Write the test section** in `supabase/tests/chemist_tracking_test.sql`. Use `set local role authenticated; set local request.jwt.claims = '{"sub":"<uuid>","role":"authenticated","app_metadata":{"role":"chemist"}}'` to impersonate. Assertions (via `do $$ … assert … $$`):
  - a chemist sees 0 rows from `select count(*) from bookings`, `sample_tracking`, `complaints`, `patient_cards`, `trust_card_requests`, `visit_ratings`;
  - a staff claim (no role) still sees bookings;
  - a staff user's direct `update bookings set assigned_chemist_id = …` raises (guard);
  - a staff user can select `chemist_pings` and `chemists`, and a chemist can select only their own `chemists` row.
- [ ] **Step 2: Write sections 1–4 of the migration:**
  1. Tables and columns above, plus RLS enabled on the new tables. Policies: staff select all on both; chemist selects own `chemists` row; no insert/update/delete policies (RPCs only).
  2. Chemist lockout: a `do $$` loop over every `public` table with `relrowsecurity = true`, excluding `chemists` and `chemist_pings`, creating `create policy chemist_blocked on public.<t> as restrictive for all to authenticated using (not public.is_chemist()) with check (not public.is_chemist())`. Drop it first if it exists. Do the same on `storage.objects`.
  3. Re-create `bookings_guard_staff_edits` from `booking_location_migration.sql:31-70`, adding the five trip columns to the protected list, and allowing changes when `current_setting('app.trip_rpc', true) = 'on'` (RPCs set this with `set_config(..., true)`).
  4. `pg_cron` job `chemist_pings_prune` daily at 03:00 Cairo: `delete from chemist_pings where at < now() - interval '30 days'`. Add `chemist_pings` and `bookings` to the `supabase_realtime` publication if not already there.
- [ ] **Step 3: Self-check.** Grep the migration for every table listed in Step 1. The loop must cover them and must not hard-code the list.
- [ ] **Step 4: Commit** `feat(tracking): schema, chemist lockout, guard, retention (not applied)`.

(Applying and running the tests happens in Task 4.)

---

### Task 3: Migration part 2: RPCs

**Files:**
- Modify: `supabase/chemist_tracking_migration.sql` (append section 5)
- Modify: `supabase/tests/chemist_tracking_test.sql` (append)

**Interfaces:** (all `security definer`, `set search_path = public`, `grant execute` only to the roles listed)

| Function | Grant | Returns / effect |
|---|---|---|
| `staff_create_home_booking(p_name text, p_phone text, p_address text, p_location_link text, p_date date, p_tests text, p_payment_method text, p_notes text) returns table(id uuid, booking_ref text)` | authenticated (checks `is_staff()`) | inserts `mode='home', source='call_center', status='تم التأكيد'`; server-side unique `booking_ref` (`to_char(now() at time zone 'Africa/Cairo','YYYYMMDD') || lpad(random 4 digits)`, retry on conflict); validates phone with existing DB phone check |
| `list_available_chemists() returns table(id uuid, name text, on_trip boolean, today_count int)` | authenticated, staff | active chemists only |
| `assign_chemist(p_booking uuid, p_chemist uuid) returns text` (the token) | authenticated, staff | home + not `ملغي` + chemist active; refuses if `trip_status='on_way'`; sets `trip_status='assigned'`; keeps existing token or makes one: `replace(translate(encode(extensions.gen_random_bytes(24),'base64'),'+/','-_'),'=','')` |
| `chemist_my_visits() returns table(id, name, phone, address, location_lat, location_lng, location_link, tests jsonb, notes, preferred_date, trip_status, track_token)` | authenticated, chemist | own, `trip_status <> 'cancelled'`, status ≠ `ملغي`, `preferred_date >= today Cairo - 1`, ordered by date |
| `chemist_start_trip(p_booking uuid) returns void` | chemist owner | requires `assigned`; refuses if the chemist already has another `on_way` |
| `chemist_ping(p_booking uuid, p_lat float8, p_lng float8, p_accuracy real) returns void` | chemist owner | raises unless `on_way`; silently ignores if last ping <10 s ago; validates lat/lng ranges |
| `chemist_arrive(p_booking uuid) returns void` | chemist owner | requires `on_way` |
| `cancel_trip(p_booking uuid, p_final boolean default false) returns void` | chemist owner (always → `assigned`) or staff (`p_final` → `cancelled`) | |
| `get_trip_by_token(p_token text) returns json` | anon, authenticated | `{status, chemist_first_name, assigned_at?, started_at, arrived_at, preferred_date, dest:{lat,lng}|null, last:{lat,lng,at}|null}`; `last` only when `on_way`; returns `null` for unknown token, `ملغي`/`cancelled`, or >24 h after arrival |
| `find_trip(p_phone text, p_booking_ref text) returns text` (token or null) | anon | normalises phone (`+20`/`0020` → `0`); returns the token only when `assigned_chemist_id` is set; rate limit 10 calls / phone / hour via a small `trip_lookup_attempts` table |
| trigger `bookings_cancel_trip_on_cancel` | | when `status` becomes `ملغي`: `trip_status='cancelled'` |

- [ ] **Step 1: Append tests:**
  - a ping before start raises;
  - a ping by another chemist raises;
  - start → ping → `get_trip_by_token` returns `last`;
  - after arrive, `last` is null and `status='arrived'`;
  - a second start while another trip is `on_way` raises;
  - `get_trip_by_token` on `assigned` → `last` null and `dest` null when there is no pin;
  - `find_trip('+201012345678', ref)` returns the token after assignment and null before;
  - setting the booking to `ملغي` makes `get_trip_by_token` null;
  - `staff_create_home_booking` as a chemist raises;
  - the returned JSON never contains the keys `phone`, `address`, `tests`.
- [ ] **Step 2: Implement the RPCs and trigger** per the table. Each mutating RPC calls `perform set_config('app.trip_rpc','on',true)` before updating `bookings`.
- [ ] **Step 3: Commit** `feat(tracking): trip RPCs, token lookup, cancel trigger (not applied)`.

---

### Task 4: Apply migration to live Supabase + run DB tests (needs Mohamed's OK)

**Files:** none new.

- [ ] **Step 1:** Show Mohamed a one-paragraph Arabic summary of what the migration changes and how to roll it back (drop the new tables/columns/policies/functions; restore the old guard from `booking_location_migration.sql`). Write the rollback as `supabase/chemist_tracking_rollback.sql` and commit it. Wait for his yes.
- [ ] **Step 2:** Apply via Supabase MCP `apply_migration` (project `thghrkzeyfinbspaascz`, name `chemist_tracking`).
- [ ] **Step 3:** Run `supabase/tests/chemist_tracking_test.sql` via `execute_sql`. It must end in ROLLBACK, insert its own fixture users/bookings, and leave nothing behind. Expected: no assertion errors.
- [ ] **Step 4:** Run `get_advisors` (security). Expected: no new warnings on the new objects.

---

### Task 5: Edge function `manage-chemist` + ERP skip

**Files:**
- Create: `supabase/functions/manage-chemist/index.ts`
- Modify: `supabase/functions/forward-booking-to-erp/index.ts` (early return 200 `{skipped:'call_center'}` when `record.source === 'call_center'`)
- Test: `supabase/functions/manage-chemist/validate.test.ts` (Deno test for the pure validator)

**Interfaces:**
- POST body `{action:'create', name, phone, password}` | `{action:'reset_password', chemist_id, password}` | `{action:'set_active', chemist_id, active}`.
- Caller JWT must carry `app_metadata.role === 'admin'`, else 403.
- `create`: `auth.admin.createUser({email: <phone>@chemist.local, password, email_confirm:true, app_metadata:{role:'chemist'}})`, then insert into `chemists`. On insert failure, delete the auth user.
- `set_active(false)` also signs the user out via `auth.admin.signOut` where available.
- Pure `validateChemistInput(body) -> {ok:true,value}|{ok:false,error}`: phone via the same normalisation as Task 1 (port it); password ≥8 chars; name 2–60 chars.

- [ ] **Step 1: Write the failing Deno tests** for `validateChemistInput` (bad phone, short password, `+20` phone normalised).
- [ ] **Step 2: Run `deno test supabase/functions/manage-chemist/`.** Expected: FAIL.
- [ ] **Step 3: Implement** the function and the ERP skip.
- [ ] **Step 4: Run the tests.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(tracking): manage-chemist edge function; skip ERP for call-center bookings`.
- [ ] **Step 6 (needs Mohamed's OK):** deploy both functions; create one test chemist.

---

### Task 6: Client data layer + map component

**Files:**
- Create: `src/lib/chemistApi.js`
- Create: `src/components/TrackMap.jsx`, `src/components/TrackMap.css`
- Modify: `package.json` (`"leaflet": "1.9.4"`)

**Interfaces:**
- `chemistApi.js` thin wrappers, each throwing an `Error` with an Arabic message on failure:
  - `listAvailableChemists()`, `assignChemist(bookingId, chemistId) -> token`, `staffCreateHomeBooking(fields) -> {id, booking_ref}`, `cancelTrip(bookingId, final)`
  - `myVisits()`, `startTrip(id)`, `sendPing(id, {lat,lng,accuracy})`, `arrive(id)`
  - `getTripByToken(token)`, `findTrip(phone, ref)`
  - `manageChemist(body)` (calls the edge function)
  - `subscribeLiveTrips(onChange) -> unsubscribe` (realtime on `chemist_pings` INSERT and `bookings` UPDATE)
  - `listLiveTrips() -> Array<{id, name, phone, address, preferred_date, trip_status, trip_started_at, trip_arrived_at, track_token, chemist_name, last_lat, last_lng, last_ping_at}>`: staff select of home bookings with a chemist where `preferred_date = today` or `trip_status = 'on_way'`, plus the latest ping per booking. The field names match `attentionFlags` in Task 1.
- `<TrackMap markers={[{id,lat,lng,kind:'chemist'|'home',label,tone:'ok'|'warn'|'idle'}]} height={number} />`: lazy `import('leaflet')`; fits bounds; updates markers without re-creating the map. Copy the approach of `feature/couriers` `src/pages/field/FieldMap.jsx` (read it with `git show feature/couriers:src/pages/field/FieldMap.jsx`). The chemist marker is a brand-green dot with a white ring; home is a coral ring.

- [ ] **Step 1:** `npm install leaflet@1.9.4`. Write the wrappers and the component.
- [ ] **Step 2:** `npm run build`. Expected: success, and leaflet lands in a separate chunk (check the `dist/assets` names).
- [ ] **Step 3:** `npm run lint`. Expected: no new errors.
- [ ] **Step 4: Commit** `feat(tracking): API wrappers and lazy Leaflet TrackMap`.

---

### Task 7: Chemist web app `/chemist`

**Files:**
- Create: `src/pages/chemist/ChemistApp.jsx` (routes: login vs visits vs trip), `ChemistLogin.jsx`, `ChemistVisits.jsx`, `ChemistTrip.jsx`, `chemist.css`
- Create: `src/lib/chemistLocation.js`, `src/lib/chemistView.js`
- Test: `src/lib/chemistView.test.js`
- Modify: `src/App.jsx` (an `isChemist = pathname.startsWith('/chemist')` branch, no splash/BottomNav/ChatWidget)
- Modify: `src/pages/admin/AdminProtectedRoute.jsx` and `AdminLogin.jsx` (role `chemist` → `<Navigate to="/chemist">`)
- Modify: `src/context/AdminAuthContext.jsx` (expose `role`)

**Interfaces:**
- `chemistLocation.js`:
  - `createLocationSource({onFix, onError}) -> {start(), stop()}`. It picks the native source when `window.Capacitor?.isNativePlatform?.()` (Plan 2 fills this in; for now it falls back to browser) and otherwise uses the browser source: `navigator.geolocation.watchPosition` with `enableHighAccuracy`, plus Screen Wake Lock (`navigator.wakeLock.request('screen')`) re-requested on `visibilitychange` → visible.
  - The throttle to one `onFix` per 20 s lives here.
- `chemistView.js`:
  - `visitAction(visit) -> 'start'|'arrive'|'none'`: `assigned`→start, `on_way`→arrive, else none.
  - `tripScreenWarning({permission:'granted'|'denied'|'prompt', lastSentAt, lastError}, now) -> null|'no_permission'|'not_sending'`: `not_sending` when nothing was sent for >2 min or the last send errored.
- Screens:
  - Login: phone + password, «دخول». Errors are shown under the field.
  - Visits («زياراتي»): cards per the spec mockup v2, with one big primary button per `visitAction`. «افتح الطريق في جوجل ماب» uses the pin or `location_link`, else an address search URL.
  - Trip: «جاري مشاركة موقعك مع العميل» banner, «آخر إرسال من X ثانية», a warning banner per `tripScreenWarning`, «وصلت» (primary), «ابعت لينك التتبع» (wa.me via `whatsAppUrl`), and «إلغاء الرحلة» (confirm dialog).
  - On load, if any visit is `on_way`, open its trip screen and start the location source (Review Focus 5).

- [ ] **Step 1: Write failing tests** for `visitAction` (all four statuses) and `tripScreenWarning` (denied → `no_permission`; last sent 3 min ago → `not_sending`; sent 30 s ago → null).
- [ ] **Step 2: Run `npm test`.** Expected: FAIL.
- [ ] **Step 3: Implement** the modules, screens, and routing.
- [ ] **Step 4: Run `npm test` and `npm run build`.** Expected: PASS.
- [ ] **Step 5: Verify in preview** (dev server, mobile viewport 375×812) with the test chemist: log in, start, see pings arriving (`select * from chemist_pings order by at desc limit 3`), reload mid-trip (it resumes), arrive. Take a screenshot.
- [ ] **Step 6: Commit** `feat(tracking): chemist web app with wake lock and resume`.

---

### Task 8: Customer page `/t/:token` + entry in «تتبع»

**Files:**
- Create: `src/pages/TrackVisit.jsx`, `src/pages/TrackVisit.css`
- Create: `src/lib/trackVisitView.js`
- Test: `src/lib/trackVisitView.test.js`
- Modify: `src/App.jsx` (an `isTrack = pathname.startsWith('/t/')` branch, no splash/BottomNav/chat)
- Modify: `src/pages/TrackSample.jsx` (a second section «تتبع الزيارة المنزلية»: phone + booking number → `findTrip` → navigate to `/t/<token>`; null → «لسه ما اتحددش كيميائي لزيارتك، هيوصلك لينك على واتساب أول ما يتحدد»)
- Modify: `src/pages/Booking.jsx` receipt (home mode only): one line «هيوصلك لينك تتابع بيه الكيميائي على واتساب أول ما يتحدد.»

**Interfaces:**
- `trackVisitView.js`: `viewModel(trip|null, now) -> {kind:'invalid'|'waiting'|'on_way'|'arrived', headline, steps:[{key,label,done,current}], eta:{min,max}|null, updatedMin:number|null, stale:boolean, markers:[...]}`. It uses `etaRange`/`minutesSince` from Task 1.
- Headlines (fixed copy):
  - `waiting` «هنبلّغك لما الكيميائي يتحرك»
  - `on_way` «الكيميائي جاي في الطريق ليك»
  - `arrived` «الكيميائي وصل»
  - `invalid` «اللينك ده مش شغال»
- Steps: «اتحدد الكيميائي» → «في الطريق» → «وصل».
- Stale note: «التحديث متأخر شوية، ممكن الشبكة ضعيفة».

- [ ] **Step 1: Write failing tests** for `viewModel`:
  - null → invalid;
  - assigned → waiting, no markers, eta null;
  - on_way with no dest → markers = [chemist], eta null;
  - on_way with dest and a ping 1 min old → eta present, stale false;
  - a ping 4 min old → stale true and eta null;
  - arrived → map markers empty.
- [ ] **Step 2: Run `npm test`.** Expected: FAIL.
- [ ] **Step 3: Implement** the page. It polls `getTripByToken` every 15 s only while `document.visibilityState==='visible'`, and has a `role="status"` region for the headline + ETA. The call button `<a href="tel:16183">اتصل بينا 16183</a>` is styled as a 52px primary button.
- [ ] **Step 4: Run `npm test` and `npm run build`.** Expected: PASS.
- [ ] **Step 5: Verify in preview** at 375 px and in dark mode against all four states using the test booking. Take screenshots.
- [ ] **Step 6: Commit** `feat(tracking): public customer tracking page and lookup`.

---

### Task 9: Staff: assign, send link, phone bookings in `BookingsTab`

**Files:**
- Modify: `src/pages/admin/BookingsTab.jsx`
- Create: `src/pages/admin/ChemistAssign.jsx` (per-row control), `src/pages/admin/PhoneBookingForm.jsx`
- Modify: `src/pages/admin/BookingsTab.jsx` `SOURCES` (add `call_center: 'الكول سنتر'`)

**Interfaces:**
- `<ChemistAssign booking chemists onChanged />`, shown for `mode==='home'` and `status!=='ملغي'`. It has:
  - a select of `listAvailableChemists()` labelled `«{name} (في رحلة)»` or `«{name} (عنده N زيارة)»`;
  - on change → `assignChemist`;
  - a trip badge (icon + word);
  - «ابعت لينك التتبع» → `window.open(whatsAppUrl(booking.phone, trackUrl(location.origin, token), firstName))`;
  - «انسخ اللينك» (clipboard);
  - «إلغاء الرحلة» when `on_way`, which calls `cancelTrip(id, true)` after a confirm.
- `<PhoneBookingForm onCreated />`, opened by «+ زيارة منزلية بالتليفون». Fields: الاسم، التليفون، العنوان، لينك الخريطة (optional)، التاريخ، التحاليل (optional text)، طريقة الدفع (كاش/فيزا عند الزيارة)، ملاحظات. Inline validation reuses `egyptPhoneError`. It calls `staffCreateHomeBooking`.

- [ ] **Step 1: Implement** both components and wire them in. The list reloads after assign/create.
- [ ] **Step 2: Run `npm run build` and `npm run lint`.** Expected: OK.
- [ ] **Step 3: Verify in preview** as the staff test user: create a phone booking → assign the test chemist → the WhatsApp URL opens with the right number/text → as the chemist the visit appears. Take a screenshot.
- [ ] **Step 4: Commit** `feat(tracking): assign chemist, send link, phone bookings in bookings tab`.

---

### Task 10: Staff: «التتبع المباشر» + admin «الكيميائيين»

**Files:**
- Create: `src/pages/admin/LiveTrackingTab.jsx`, `src/pages/admin/ChemistsTab.jsx`
- Modify: `src/pages/admin/BranchSamplesDashboard.jsx` (add the live tab), `src/pages/admin/AdminDashboard.jsx` (add live + chemists tabs, using its existing tab/rail pattern)

**Interfaces:**
- `LiveTrackingTab`: `listLiveTrips()` on mount and on every `subscribeLiveTrips` event (debounced 1 s). It also re-evaluates `attentionFlags` every 30 s via a timer.
  - `TrackMap` shows `on_way` chemists (tone: `warn` if stale, else `ok`).
  - The list is sorted by `attentionRank`, then name.
  - Badges: «التتبع متوقف N د», «رحلة طويلة», «لسه ما اتحركش», «في الطريق», «وصل».
  - Each row has «ابعت لينك التتبع».
- `ChemistsTab` (admin only): a table of chemists (name, phone, active, today's visits), plus «+ كيميائي جديد» (name, phone, password), «غيّر الباسورد», and an «إيقاف»/«تفعيل» toggle. All go through `manageChemist`.

- [ ] **Step 1: Implement** both tabs.
- [ ] **Step 2: Run `npm run build` and `npm run lint`.** Expected: OK.
- [ ] **Step 3: Verify in preview** with two tabs open: chemist on a trip in one, staff live tab in the other. The marker moves within ~30 s with no reload. Stop the pings for 5 min, and «التتبع متوقف» appears at the top. Take a screenshot.
- [ ] **Step 4: Commit** `feat(tracking): live tracking board and chemists admin`.

---

### Task 11: Ship (needs Mohamed's OK at each push/deploy)

- [ ] **Step 1:** Run `npm test`, `npm run build`, and `npm run lint` one last time. All green.
- [ ] **Step 2:** Push branch `feature/chemist-tracking` and open a PR to `main` with an Arabic + English summary. Vercel preview builds.
- [ ] **Step 3:** On the Vercel preview, run through the four-state customer page, the chemist flow, and the staff flow once more end to end on a real Android phone (Chrome), with the screen kept on via wake lock.
- [ ] **Step 4:** After Mohamed merges, hand him a short Arabic note: how to add chemists, how the call center sends the link, and that Plan 2 (Android background app) comes next.
