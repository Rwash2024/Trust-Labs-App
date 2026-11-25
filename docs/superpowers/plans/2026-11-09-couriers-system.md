# Couriers System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Trust Labs see and measure every courier movement and every wait (branch, lab handover) from clinic request to lab confirmation, with courier, branch, lab-reception, الربط, manager and management screens.

**Architecture:** New `/field/*` area inside the existing React 19 + Vite app (separate from the patient shell and from `/admin`), sharing `AdminAuthContext` and the Supabase project. All state changes go through `security definer` Postgres RPCs that stamp **server time**; RLS scopes reads by role/branch/courier. Pure logic (distance, lateness, count mismatch) lives in `src/lib/couriers/` and is unit-tested with Vitest. Maps: Leaflet + OpenStreetMap. Realtime: Supabase Realtime.

**Tech Stack:** React 19, react-router 7, Supabase (Auth, Postgres RLS, Realtime), Leaflet 1.9.4 (new), Vitest (new, dev only).

**Spec:** `docs/superpowers/specs/2026-11-09-couriers-system-design.md`

## Global Constraints

- Arabic RTL, simple Egyptian-Arabic UI copy; light theme using existing tokens (`--color-primary #39B76E`, `--color-primary-darker #1F6B3D`, `--color-primary-light #E9F8EF`, `--color-error #EF4444`, `--color-warning #F59E0B`); text ≥16px, tap targets ≥56px tall; readable in sunlight.
- Zero added running cost: Supabase free tier, OSM tiles, browser Geolocation, no paid routing API.
- Roles in `auth.users.raw_app_meta_data.role`: `courier`, `branch`, `courier_manager`, `linking`, `lab_reception`, `management` (التشغيل / الربط / رئيس المجلس), plus existing `admin`. `admin` and `management` see everything.
- One shared account per branch (linked to one branch); one personal account per courier.
- Do not modify `sample_tracking` or patient-facing code.
- Timestamps always server-side (`now()` in RPCs); client times are never trusted.
- Arrival check: GPS ≥150 m from the stop at «وصلت» sets `far_flag` (value from settings key `arrival_radius_m`, default 150).
- Live ping ~every 60 s only between «بدأت يومي» and «خلّصت يومي», only while app is open; `location_pings` older than 30 days deleted daily.
- Lateness thresholds are rows in `settings` (`branch_wait_minutes`, `lab_handover_minutes`, plus optional per-area overrides), editable only by `management`/`admin`, every change audited.
- Branch sample count is mandatory (integer ≥ 0 … ≥ 1 when status is picked up).

## Review Focus

- Double-tapping a button, or an offline queue replaying, must not create duplicate events or move timestamps (RPCs idempotent per `run_stop_id` + step).
- A branch account must never read or write another branch's stops; a courier never another courier's run.
- GPS permission denied / unavailable: tap still succeeds, stamped "no location" (not blocked, not flagged far).
- Branch taps «جاهزة» after the run already left, or twice in one day for two runs: each tap belongs to the correct run-stop.
- Counts: negative, non-integer, 0 at pickup, or edited by the courier after the branch typed: both numbers kept, mismatch flagged, nothing overwritten.

---

## File Structure

- `supabase/couriers_migration.sql` — tables, indexes, RLS, RPCs, realtime publication.
- `supabase/couriers_seed.sql` — settings defaults, branch stop rows, couriers/templates (clinics + routes need Mohamed's data).
- `src/lib/couriers/geo.js`, `metrics.js`, `queue.js`, `api.js`, `roles.js` — one responsibility each.
- `src/lib/couriers/*.test.js` — Vitest.
- `src/pages/field/` — `FieldApp.jsx` (routes + role guard), `FieldLogin.jsx`, `CourierHome.jsx`, `BranchPanel.jsx`, `LabReception.jsx`, `ManagerConsole.jsx`, `LinkingForm.jsx`, `ChatPanel.jsx`, `ManagementDashboard.jsx`, `ThresholdSettings.jsx`, `FieldMap.jsx`, `field.css`.
- Modify `src/App.jsx` (route `/field/*`), `package.json` (deps, `test` script), `vite.config.js` (vitest block if needed).

---

### Task 1: Test tooling and pure logic

**Files:**
- Modify: `package.json`, `vite.config.js`
- Create: `src/lib/couriers/geo.js`, `src/lib/couriers/metrics.js`
- Test: `src/lib/couriers/geo.test.js`, `src/lib/couriers/metrics.test.js`

**Interfaces:**
- Produces: `distanceMeters(a: {lat,lng}, b: {lat,lng}): number`; `isFarFromStop(pos: {lat,lng}|null, stop: {lat,lng}, radiusM: number): boolean` (null pos ⇒ `false`); `waitMinutes(startIso: string|null, endIso: string|null, nowIso: string): number|null`; `lateStatus(minutes: number|null, thresholdMinutes: number): 'ok'|'warn'|'late'|'unknown'` (warn from 75% of threshold); `countMismatch(entries: {branchCount:number|null, courierCount:number|null}[], courierTotal: number, labCount: number|null): {stopMismatches: number[], totalMismatch: boolean, labMismatch: boolean}`.

- [ ] **Step 1:** `npm i -D vitest@^3` and add script `"test": "vitest run"`.
- [ ] **Step 2: Write failing tests** — `distanceMeters` between مصر الجديدة and مدينة نصر coordinates ≈ known value within 1%; `isFarFromStop(null, …)` is `false`; 149 m ⇒ `false`, 151 m ⇒ `true` at radius 150; `lateStatus(60, 60)` is `'late'`, `lateStatus(45, 60)` is `'warn'`, `lateStatus(null, 60)` is `'unknown'`; `waitMinutes` with `endIso=null` counts to `nowIso`; `countMismatch` flags stop index 1 when branch 12 vs courier 11, and `totalMismatch` when sum ≠ courierTotal.
- [ ] **Step 3:** Run `npm test` — expect FAIL (modules missing).
- [ ] **Step 4:** Implement both modules (haversine; pure functions, no I/O).
- [ ] **Step 5:** Run `npm test` — expect PASS. Commit `feat(couriers): geo and metrics logic`.

### Task 2: Database schema, RLS, RPCs

**Files:**
- Create: `supabase/couriers_migration.sql`

**Interfaces:**
- Produces tables: `couriers(id uuid pk → auth.users, name, area text, active bool)`, `stops(id serial, kind 'branch'|'clinic', branch_id int null → branches, name, lat, lng, area)`, `branch_accounts(user_id uuid pk, branch_id int)`, `route_templates(id, courier_id, shift 'morning'|'evening')`, `route_template_stops(template_id, position, stop_id)`, `runs(id, courier_id, run_date, shift, kind 'template'|'adhoc', status 'planned'|'out'|'returned'|'closed', left_lab_at, returned_lab_at)`, `run_stops(id, run_id, stop_id, position, status 'pending'|'ready'|'empty'|'arrived'|'picked_up'|'skipped', ready_at, arrived_at, picked_up_at, branch_count, courier_count, arrival_lat, arrival_lng, arrival_distance_m, far_flag, request_id)`, `pickup_requests(id, stop_id, created_by, note, urgent, status 'new'|'assigned'|'done', created_at, run_stop_id)`, `handovers(id, run_id, courier_count, lab_count, courier_handed_at, lab_confirmed_at, lab_confirmed_by)`, `location_pings(id, courier_id, lat, lng, at)`, `settings(key pk, value jsonb, updated_by, updated_at)`, `settings_audit`, `messages(id, courier_id, sender_id, body, request_id, created_at)`.
- Produces RPCs (all `security definer`, caller role checked inside, idempotent): `create_daily_runs(p_date date)`, `start_day()`, `end_day()`, `start_run(p_run_id)`, `branch_set_ready(p_run_stop_id, p_ready bool)`, `branch_confirm_pickup(p_run_stop_id, p_courier_id uuid, p_count int)`, `courier_arrive(p_run_stop_id, p_lat, p_lng)`, `courier_confirm_count(p_run_stop_id, p_count int)`, `courier_skip(p_run_stop_id)`, `courier_return_lab(p_run_id)`, `courier_hand_over(p_run_id, p_count int)`, `lab_confirm(p_run_id, p_count int)`, `create_pickup_request(p_stop_id, p_note, p_urgent)`, `assign_request(p_request_id, p_run_id)`, `substitute_courier(p_run_id, p_courier_id)`, `record_ping(p_lat, p_lng)`, `update_setting(p_key, p_value jsonb)`.

- [ ] **Step 1:** Write the migration; enable RLS on every table; helper `public.app_role() returns text` reading `auth.jwt()->'app_metadata'->>'role'`. Policies: couriers read own runs/run_stops/messages; branch role reads/writes only `run_stops` whose `stop_id` maps to its `branch_accounts.branch_id`; `courier_manager`, `linking` (requests only), `lab_reception` (handovers), `management`/`admin` per spec; direct table writes denied, all writes via RPCs.
- [ ] **Step 2:** Add the tables needing live updates to the `supabase_realtime` publication (`run_stops`, `runs`, `pickup_requests`, `messages`, `handovers`, `location_pings`).
- [ ] **Step 3:** Schedule daily `delete from location_pings where at < now() - interval '30 days'` with `pg_cron`.
- [ ] **Step 4 (verify):** Apply on a Supabase **branch/test project** (not production). In the SQL editor with `set local role authenticated; set local request.jwt.claims …` for each role, run a checklist script `supabase/couriers_rls_check.sql`: branch A user cannot select branch B's `run_stops`; courier 1 cannot select courier 2's `runs`; calling `branch_set_ready` twice leaves `ready_at` unchanged; `courier_arrive` twice leaves `arrived_at` unchanged; `update_setting` as `courier_manager` raises. Expected: every statement returns the expected rows/error.
- [ ] **Step 5:** Commit `feat(couriers): schema, RLS and RPCs`.

### Task 3: Seed data and accounts

**Files:**
- Create: `supabase/couriers_seed.sql`, `supabase/COURIERS_SETUP.md`

- [ ] **Step 1:** Seed `settings` (`branch_wait_minutes` 60, `lab_handover_minutes` 30, `arrival_radius_m` 150, per-area overrides empty) and a `stops` row for each of the 19 branches with lat/lng (look up coordinates for each address; mark approximate ones in a comment).
- [ ] **Step 2:** **Needs Mohamed's data:** clinic list (≈10) with locations, the 10 couriers and their morning/evening route templates, branch/role account emails. Until provided, ship the seed with a clearly marked `-- TODO` template block and the loader script structure.
- [ ] **Step 3:** `COURIERS_SETUP.md`: Arabic/English steps to create Supabase Auth users and set `app_metadata.role`, insert `branch_accounts`, `couriers`, templates.
- [ ] **Step 4 (verify):** `select count(*) from stops where kind='branch'` returns 19; `select create_daily_runs(current_date)` creates one run per courier per shift. Commit.

### Task 4: Field app shell, login, role guard

**Files:**
- Create: `src/pages/field/FieldApp.jsx`, `FieldLogin.jsx`, `field.css`, `src/lib/couriers/roles.js`, `src/lib/couriers/api.js`
- Modify: `src/App.jsx`, `package.json` (`npm i leaflet@1.9.4`)
- Test: `src/lib/couriers/roles.test.js`

**Interfaces:**
- Produces: `homeForRole(role: string|undefined): string` returning `/field/courier`, `/field/branch`, `/field/lab`, `/field/manager`, `/field/linking`, `/field/dashboard` (management/admin), or `/field/login`; `rpc(name: string, args?: object): Promise<{data, error}>` in `api.js` wrapping `supabase.rpc` and mapping errors to Arabic messages; `useRole(): string|undefined` from `AdminAuthContext` session.

- [ ] **Step 1:** Failing test for `homeForRole` for all seven roles plus `undefined`.
- [ ] **Step 2:** Implement; run `npm test` (PASS).
- [ ] **Step 3:** `App.jsx`: add `const isField = location.pathname.startsWith('/field')` (excluded from splash, patient shell, bottom nav) and a `<Routes>` branch rendering `FieldApp`. `FieldApp` redirects `/field` to `homeForRole`; unauthorised roles are redirected, not shown a blank page.
- [ ] **Step 4 (verify):** `npm run dev`, sign in with a test courier and a test branch account, confirm each lands on its own route and cannot open the other's. Commit.

### Task 5: Branch panel (ready / empty / hand over)

**Files:**
- Create: `src/pages/field/BranchPanel.jsx`

**Interfaces:**
- Consumes: `rpc` (Task 4), RPCs `branch_set_ready`, `branch_confirm_pickup`.
- Desktop-first layout (branch uses a computer).

- [ ] **Step 1:** Show today's `run_stops` for the account's branch: per run the expected courier, status chip (جاهز / مفيش عينات / وصل / استلم). Buttons: «العينات جاهزة», «مفيش عينات اليوم», and, when the courier has arrived, a courier select (preselected if one) + required count stepper (min 1) + «سلّمت العينات».
- [ ] **Step 2:** Subscribe to Realtime on `run_stops` for the branch so arrival appears without refresh.
- [ ] **Step 3 (verify):** With two test runs the same day (morning/evening), «جاهزة» in the morning does not mark the evening run; double click leaves one timestamp. Commit.

### Task 6: Courier home and offline queue

**Files:**
- Create: `src/pages/field/CourierHome.jsx`, `src/lib/couriers/queue.js`
- Test: `src/lib/couriers/queue.test.js`

**Interfaces:**
- Produces: `enqueue(action: {id: string, name: string, args: object}): void`, `flush(send: (a) => Promise<boolean>): Promise<number>` (removes only actions whose `send` returned `true`, keeps order, de-duplicates by `id`), stored in `localStorage` with try/catch.

- [ ] **Step 1:** Failing tests: flush keeps failed items, preserves order, and replaying the same `id` twice sends once.
- [ ] **Step 2:** Implement `queue.js`; run tests (PASS).
- [ ] **Step 3:** `CourierHome`: «بدأت يومي»/«خلّصت يومي», current run with ordered stops showing ready/empty/not-confirmed chips, one primary button for the next stop («وصلت» → «استلمت وتحرّكت»), «مفيش عينات» (skip), count confirm/edit, urgent tasks badge. Each tap gets GPS via `navigator.geolocation` (timeout 8 s; on failure send `null` position), calls the RPC through the queue, optimistic UI. Ping `record_ping` every 60 s while a day is started and the page is visible.
- [ ] **Step 4 (verify):** On a phone-size viewport: tap while offline (DevTools offline), reconnect, one event appears with the original server-order; GPS blocked ⇒ tap still succeeds. Commit.

### Task 7: Map

**Files:**
- Create: `src/pages/field/FieldMap.jsx`

**Interfaces:**
- Produces: `<FieldMap markers={{id, lat, lng, label, tone: 'ok'|'warn'|'late'|'idle'}[]} line={{from:{lat,lng}, to:{lat,lng}}|null} height={number} />` using Leaflet + OSM tiles with attribution; lazy-loaded.

- [ ] **Step 1:** Implement; use it in `CourierHome` (current position → next stop line) and later dashboards.
- [ ] **Step 2 (verify):** Renders in both mobile and desktop widths, no console errors, attribution visible. Commit.

### Task 8: Lab reception and courier return/hand-over

**Files:**
- Create: `src/pages/field/LabReception.jsx`
- Modify: `src/pages/field/CourierHome.jsx` (final step)

- [ ] **Step 1:** Courier: after the last stop «وصلت المعمل» (`courier_return_lab`) then «سلّمت للربط» with total count (`courier_hand_over`).
- [ ] **Step 2:** Lab screen: live queue of couriers who handed over, waiting minutes (with `lateStatus` vs `lab_handover_minutes`), count entry, «استلمت» (`lab_confirm`). Mismatch (`countMismatch`) shown for the manager.
- [ ] **Step 3 (verify):** Hand-over then confirm shows the gap; confirming twice changes nothing. Commit.

### Task 9: Manager console

**Files:**
- Create: `src/pages/field/ManagerConsole.jsx`

- [ ] **Step 1:** List couriers with live status, last ping on `FieldMap`, far-flag and mismatch alerts, nudge for stops not confirmed.
- [ ] **Step 2:** Actions: `substitute_courier`, add an urgent stop/request to a run in progress (`assign_request`), create an ad-hoc run (clinics run or Giza cover) from the stops list.
- [ ] **Step 3 (verify):** Substitute for one day leaves the template unchanged; assigned urgent stop appears on that courier's route within ~2 s. Commit.

### Task 10: الربط request form

**Files:**
- Create: `src/pages/field/LinkingForm.jsx`

- [ ] **Step 1:** Clinic select, note, urgent/normal, «ابعت لمدير المناديب» → `create_pickup_request`; list of today's requests with status. Requests appear in the manager console queue.
- [ ] **Step 2 (verify):** Request time is the server time and starts the chain metric. Commit.

### Task 11: Chat and tasks

**Files:**
- Create: `src/pages/field/ChatPanel.jsx`

- [ ] **Step 1:** 1:1 thread per courier (`messages.courier_id`), Realtime subscription, unread badge; used in `CourierHome` (tab) and `ManagerConsole`.
- [ ] **Step 2:** Messages linked to a task show the request card.
- [ ] **Step 3 (verify):** Two browsers (manager, courier) exchange messages live; a courier cannot read another courier's thread. Commit.

### Task 12: Management dashboard and thresholds

**Files:**
- Create: `src/pages/field/ManagementDashboard.jsx`, `ThresholdSettings.jsx`

- [ ] **Step 1:** KPIs (couriers in field, samples waiting at branches, late handovers, average branch wait), live map, latest movements with ok/warn/late colours from `lateStatus` using settings.
- [ ] **Step 2:** `ThresholdSettings` (management/admin only): edit the thresholds and per-area overrides through `update_setting`; show the audit list (who, when, old → new).
- [ ] **Step 3 (verify):** Changing `branch_wait_minutes` recolours rows immediately; a manager account is refused. Commit.

### Task 13: Polish, PWA, deploy

**Files:**
- Modify: `src/pages/field/field.css`, `vite.config.js` (PWA scope if needed)

- [ ] **Step 1:** Contrast and sunlight pass (≥4.5:1, large buttons); check 375 px and 1280 px.
- [ ] **Step 2:** Test PWA install and push/notification behavior on the couriers' real phones; fall back to in-app badge when unavailable.
- [ ] **Step 3:** Run `npm run build` and `npm run lint`; apply the migration to production only after Mohamed approves; onboard couriers (location notice message).
- [ ] **Step 4:** Commit.

---

## Self-Review

- Spec coverage: screens 1–6 → Tasks 6/5/8/9/12/10; run model → Tasks 2–3; thresholds → Task 12; chat/tasks → Task 11; counts/mismatch → Tasks 1, 5, 8; tracking/offline/pruning → Tasks 2, 6; look and feel → Task 13.
- Open dependency: Task 3 needs the clinic list, routes and accounts from Mohamed; Tasks 4–13 can proceed with test data.
