# Home-visit chemist live tracking — design

Date: 2026-11-25 · Owner: Mohamed (marketing / product) · Status: draft for approval

## ملخص بالعربي

العميل اللي حاجز زيارة منزلية بيوصله لينك سري، يفتحه يلاقي الكيميائي على الخريطة. معاه حالته (اتحرك، في الطريق، وصل) ووقت الوصول التقريبي، فيبطّل يتصل يسأل.

الكول سنتر بيختار الكيميائي لكل زيارة من لوحة الحجوزات، ويبعت اللينك للعميل على واتساب. والكول سنتر والإدارة بيشوفوا كل الزيارات اللي شغالة على خريطة واحدة.

الكيميائي عنده تطبيق أندرويد صغير بيبعت موقعه في الخلفية حتى والموبايل مقفول، من أول "أنا في الطريق" لحد "وصلت" بس. اللي معاهم آيفون بيستخدموا نفس الصفحة من المتصفح، والشاشة ما بتقفلش.

## Intent

Customers phone the call center to ask "where is the chemist?". The goal: the customer can see it themself, so those calls stop. Call center and management see the same thing for every live visit.

Success = home-visit customers stop calling to ask where the chemist is; call center can answer any remaining call by glancing at one screen.

## Goals

1. Call center assigns a chemist to a home-visit booking (from the bookings tab, choosing among available chemists).
2. Chemist has a phone screen listing their assigned visits; taps «أنا في الطريق» to start the trip and «وصلت» to end it.
3. During the trip, the chemist's location is sent **in the background, even with the phone locked** (Android app). iPhone/browser fallback keeps the screen awake.
4. Customer opens a secret per-visit link and sees: chemist on a map, status steps, rough ETA, «آخر تحديث» time, appointment date, chemist first name, a call button to 16183.
5. Call center sends the link to the customer via WhatsApp (company number, `wa.me` with prefilled text). The chemist also has an optional "send link" button.
6. Call center + admin: a live screen with all visits on a map and a list with status, plus a warning when tracking has gone silent.

## Non-goals (this phase)

- Automatic SMS/WhatsApp sending (needs a paid provider + Meta approval). Later phase.
- Lateness against the appointment *time*: bookings store a date only (`preferred_date`, `Booking.jsx:601`), no time slot. We flag silence and long trips instead.
- Route-based ETA (Google Directions / OSRM). Straight-line estimate only.
- iOS native app.
- Play Store publishing of the chemist app.
- Any tracking of branch visits or of sample couriers (separate `feature/couriers` system; not merged, not touched).

## Anti-goals (would make this a failure even if it works)

- **Tracking chemists outside a trip.** Phones are personal. Location is recorded only between «أنا في الطريق» and «وصلت» (or cancel). Never before, never after.
- **Exposing the chemist's personal phone number** to customers by default.
- **Anyone guessing a link** (e.g. from a phone number or booking ref) and seeing a chemist's location or patient data.
- **A chemist account that can read other patients' data.** Today any logged-in user can read all bookings (see Constraints).
- A screen hard to read for elderly customers: small text, colour-only status, tiny buttons.

## Constraints (from the codebase)

- Stack: React + Vite + Supabase, Arabic RTL, multi-client build (`VITE_CLIENT`, default `trustlabs`). Brand green `--color-primary` #39B76E (`clients/trustlabs/brand.json`). Main has no map library and no realtime.
- Customers book anonymously. They only get `booking_ref` (`Booking.jsx:329`), which is weak (date + 3 random digits) → must NOT be the tracking key.
- `bookings` RLS: anon INSERT only; **any `authenticated` user can SELECT/UPDATE** (`chat_bookings_migration.sql:33-45`). Trigger `bookings_guard_staff_edits` limits non-admins to `status`/`updated_at` via an explicit column list (`booking_location_migration.sql:31-70`) — new columns must be added to it.
- Staff roles: `app_metadata.role === 'admin'` = admin; any other logged-in user = staff (call center/branch) (`AdminAuthContext.jsx:33`). Staff land on `/admin/samples` (`BranchSamplesDashboard.jsx`), which already hosts `BookingsTab`.
- Bookings may carry a patient map pin (`location_lat/lng`, or `location_link`) — use it as the destination when present.
- Web pages cannot report location while the screen is locked. Hence the Android app.
- Live Supabase project: `thghrkzeyfinbspaascz`. Mohamed approves each live step (migrations, deploys).

## Decided by Mohamed

- Customer + call center + management all need to see it.
- Start with: tracking page with link; reachable from the app; WhatsApp link sent manually. Auto messages later.
- Chemists use personal phones, mostly Android → **build a small Android app with real background tracking**.
- Call center picks the chemist per visit from the bookings board, based on who is available.
- Call center sends the link; customer call button → 16183. Chemist may also send it (optional).

## Design

### Data (new migration `supabase/chemist_tracking_migration.sql`)

- `chemists` — `id uuid pk references auth.users`, `name text`, `phone text` (internal only), `active bool default true`, `created_at`.
- Role: `app_metadata.role = 'chemist'`.
- `bookings` new columns:
  - `assigned_chemist_id uuid references chemists(id)`
  - `track_token text unique` — 32+ char random, generated server-side on assignment
  - `trip_status text check in ('assigned','on_way','arrived','cancelled')`
  - `trip_started_at`, `trip_arrived_at timestamptz`
  - Add all of these to the `bookings_guard_staff_edits` protected list; they change only through the RPCs below.
- `chemist_pings` — `id bigserial`, `booking_id uuid`, `chemist_id uuid`, `lat`, `lng`, `accuracy_m`, `at timestamptz default now()` (server time). Index `(booking_id, at desc)`. Clients never write directly.
- Retention: pg_cron deletes pings older than 30 days.

### RPCs (security definer; all writes go through them)

| RPC | Who | Does |
|---|---|---|
| `assign_chemist(booking_id, chemist_id)` | staff/admin | sets chemist, `trip_status='assigned'`, creates `track_token` if missing; home bookings only; refuses while `on_way` unless reassigning |
| `list_available_chemists()` | staff/admin | active chemists + whether each is currently `on_way` + today's assigned count |
| `chemist_my_visits()` | chemist | their assigned visits for today and upcoming: name, phone, address, pin, tests, date, status. Nothing else |
| `chemist_start_trip(booking_id)` | chemist (owner) | `on_way`, `trip_started_at=now()`; only one trip `on_way` at a time per chemist |
| `chemist_ping(booking_id, lat, lng, accuracy)` | chemist (owner) | insert only when that booking is `on_way`; rejects otherwise (this enforces "no tracking outside a trip"); light rate limit (≥10 s apart) |
| `chemist_arrive(booking_id)` | chemist (owner) | `arrived`, `trip_arrived_at=now()` |
| `cancel_trip(booking_id)` | chemist owner or staff | back to `assigned`, or `cancelled` |
| `get_trip_by_token(token)` | anon | chemist first name, status, step times, appointment date, destination pin, latest ping (lat/lng/at) **only while `on_way`**. Never returns patient phone/address/tests |

### Security

- Add restrictive RLS policies so the `chemist` role cannot SELECT/UPDATE `bookings`, `sample_tracking`, complaints, Trust Card / medical-file tables, or any other patient table directly. Chemists only use the RPCs. Builder must enumerate every table with an `authenticated` policy and cover it.
- Staff/admin read `chemist_pings` + `chemists` via RLS (needed for realtime on the live screen).
- The chemist login must not reach `/admin`; route chemists to `/chemist`.

### Screens

Visual rules for all three: Arabic RTL, base text ≥16px (customer page 18px), touch targets ≥48px, status always shown as **icon + word**, never colour alone. Brand green for "moving/ok", amber for "attention", grey for "not started". Status changes announced with `role="status"`. Mobile-first; staff screen also works on desktop.

1. **Chemist — `/chemist`** (browser and inside the Android app)
   - Login (email + password, same Supabase auth).
   - «زياراتي النهارده»: cards with patient name, area/address, date, tests count, "open in Google Maps" button for navigation.
   - One big primary button per card, changing with state: «أنا في الطريق» → (trip screen) «وصلت». Secondary: «إلغاء الرحلة», «ابعت لينك التتبع للعميل» (optional `wa.me`).
   - Trip screen shows "مشاركة موقعك شغالة" with the last-sent time; a visible warning if the location permission is off or pings fail.
   - Browser: Screen Wake Lock while on trip, re-requested on return to the page; a hint "سيب الصفحة دي مفتوحة".
2. **Customer — `/t/:token`** (public, no login, no splash)
   - Header line by status: «الكيميائي جاي في الطريق ليك» / «الكيميائي وصل» / «هنبلّغك لما الكيميائي يتحرك».
   - Map (chemist marker + destination pin if known).
   - Status steps: اتحدد الكيميائي → في الطريق → وصل.
   - ETA chip "حوالي 10–15 دقيقة": straight-line distance × 1.4 ÷ 25 km/h, shown as a 5-minute range. Only if destination pin exists and last ping < 3 min old.
   - «آخر تحديث من X دقيقة». If > 3 min: soft note "التحديث متأخر شوية، ممكن الشبكة ضعيفة".
   - Chemist first name, appointment date, button «اتصل بينا 16183».
   - Refreshes via polling `get_trip_by_token` every 15 s while visible.
   - Invalid/old token: friendly "اللينك ده مش شغال" + 16183.
   - After arrival: map hidden, shows «الكيميائي وصل».
3. **Call center / admin**
   - `BookingsTab`: for home bookings, a "الكيميائي" dropdown (from `list_available_chemists`, showing "في رحلة" / "عنده N زيارات" next to names), trip status badge, and «ابعت لينك التتبع» → `wa.me/<patient phone>` with prefilled Arabic text + link. Also a copy-link button.
   - **«+ زيارة منزلية بالتليفون»** button in `BookingsTab` (decided by Mohamed: many home visits are booked by phone on 16183 and never reach `bookings`). It opens a short form: name, phone, address, optional map link, date, tests (optional, free text or catalog pick), payment method, notes. It inserts a row with `source = 'call_center'` through a staff RPC `staff_create_home_booking` (server-generated `booking_ref`), so it can then be assigned and tracked like any other booking.
   - New tab «التتبع المباشر» (both `/admin` and `/admin/samples`): map with all `on_way` chemists + list sorted by attention. Flags:
     - «التتبع متوقف» when no ping for 5 min.
     - «رحلة طويلة» when on the way for more than 60 min.
     - «لسه ما اتحركش» for today's assigned visits not started.
     Realtime on `chemist_pings` and `bookings`.
   - Admin: «الكيميائيين» list to add/deactivate chemists. Adding a chemist creates the auth user with role `chemist` through an admin-only edge function (`create-chemist`).

### Map

- Leaflet 1.9.4 + OpenStreetMap tiles. Reuse the approach of `FieldMap.jsx` / `lib/couriers/mapView.js` from `feature/couriers` by copying it. Do not merge that branch.
- Lazy-loaded so it doesn't weigh down the public site.

### Android chemist app

- Capacitor wrapper in a new folder `chemist-app/`, loading the hosted `/chemist` page (`server.url`), so web updates ship without a new APK.
- Background location: `@capacitor-community/background-geolocation` (free) with a foreground-service notification «جاري مشاركة موقعك مع العميل». Started on «أنا في الطريق», stopped on «وصلت» or cancel. Sends to `chemist_ping` every ~30 s or on 50 m movement.
- The page detects it's inside the app (Capacitor bridge) and uses the native plugin; otherwise it uses the browser geolocation + Wake Lock.
- Package id `com.trustlabs.chemist`, signed release APK, distributed directly (not Play Store).
- Install guide (Arabic, with screenshots) for: installing the APK, allowing location "طول الوقت", turning off battery optimisation (Xiaomi, Oppo, Realme, Samsung, Honor).

### Rollout (each live step approved by Mohamed)

1. Migration on live Supabase, then create one test chemist.
2. Web screens deployed (Vercel preview first).
3. APK to 1–2 chemists for a one-week trial.
4. Then all chemists.

## Left to the builder

- Exact component split, file names, polling and ping intervals within the ranges above.
- Wording of minor UI text (keep simple Egyptian Arabic, light tone, few emojis).
- Whether `list_available_chemists` and the live screen share a query.
- How the browser fallback handles a page reload mid-trip. It should resume from `trip_status`.

## Calls made by Claude (not explicitly confirmed by Mohamed)

- Secret random token in the link (not phone or booking ref).
- Tracking hard-limited to trip time, enforced in the database.
- Free OpenStreetMap map instead of Google Maps.
- Chemist role locked out of all patient tables except their own visits.
- Straight-line ETA shown as a range.
- Silence (5 min) and long trip (60 min) alerts instead of lateness vs appointment.
- APK sideload rather than Play Store.
- 30-day ping retention.
- Admin can add chemists from the dashboard via an edge function.
- **Customer in-app entry:** the existing «تتبع» page gets a "تتبع الزيارة المنزلية" option. The customer enters phone + `booking_ref`, and RPC `find_trip(phone, booking_ref)` returns the token, then redirects to `/t/:token`. Rate-limited, and returns nothing until a chemist is assigned. The receipt screen tells the customer the link will come on WhatsApp once a chemist is assigned. The WhatsApp link opens in the browser (no TWA deep-link work).
- **Chemist login:** phone number + password. Internally this maps to a synthetic email `<phone>@chemist.local`, so no SMS provider is needed. Admin sets and resets the password from «الكيميائيين». The session stays signed in on the phone.
- **Trip vs booking status kept separate:** «وصلت» does not change `status`, so nothing new goes to the ERP. A booking set to `ملغي` cancels any active trip and blocks assignment. A chemist can be assigned to any non-cancelled home booking. `cancel_trip` by the chemist goes back to `assigned` (call center reassigns if needed). Staff can also set `cancelled`.
- Phone bookings created by the call center (`source='call_center'`) are **not** forwarded to the ERP, on the assumption that the call center already records phone bookings in the ERP the usual way. This avoids duplicates. Easy to flip later.
- Token stays valid for 24 h after arrival, showing «الكيميائي وصل». After that it shows "اللينك ده خلص".
