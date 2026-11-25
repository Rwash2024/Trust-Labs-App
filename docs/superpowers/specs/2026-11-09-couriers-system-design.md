# Couriers (المناديب) system — design

Date: 2026-11-09 · Owner: Mohamed (Trust Labs marketing/IT) · Status: draft for review

## Intent and why

Trust Labs has 10 couriers who collect lab samples from branches and contracted clinics and deliver them to the central lab. Today movements are reported ad hoc and clinic pickups are dispatched over WhatsApp (clinic → الربط → courier manager → couriers). The pain: **samples wait too long at branches before pickup, and wait too long at handover inside the central lab.** Nobody can see where time is lost, and management (إدارة التشغيل، إدارة الربط، رئيس مجلس الإدارة) has no live view.

The system makes every movement and wait **visible and measured**, from the moment a clinic asks for a pickup to the moment the central lab confirms receipt. A secondary goal: it should impress management enough that they adopt it (look polished, light, clear).

## Users and screens

Build inside the existing Trust Labs app (React + Vite + Supabase, PWA, Arabic RTL) as new routes/roles, reusing Supabase Auth and the admin shell/rail. Do not touch `sample_tracking` (patient-facing); add new tables.

Roles (new, via `app_metadata.role`): `courier`, `branch`, `courier_manager`, `linking` (الربط), `lab_reception`, plus existing `admin`. Management (التشغيل / الربط / رئيس المجلس) see everything.

1. **Courier screen (mobile, daylight)** — shows today's route: ordered stops, current stop emphasized, one big button per step: «وصلت» → «استلمت العينات وتحرّكت». «مفيش عينات» skips a stop. Final stop: «وصلت المعمل المركزي / سلّمت العينات» with count. Small map: current position → next stop (from/to). Tasks sent by the manager appear in the route (urgent flagged). Chat tab with the manager. Courier confirms/edits the sample count the branch entered.
2. **Branch screen (mobile/tablet)** — lists couriers expected today and who has arrived. Staff chooses **which courier took the samples** (preselected if only one arrived; covers substitutes), enters **sample count (required, +/− buttons)**, taps «سلّمت العينات». Also «مفيش عينات اليوم». A branch account sees only its own branch.
3. **Central-lab reception screen** — courier taps «سلّمت»; lab staff **confirm receipt with a count**. Gap between the two taps is the in-lab handover delay (a stated pain point).
4. **Courier manager screen (desktop)** — all couriers with live status, live map, per-courier chat, send task (clinic + courier + urgent), reassign/substitute a courier for a day without changing the route template.
5. **Management dashboard (desktop)** — KPIs (couriers in field, samples waiting at branches, late handovers, average pickup time), live map, latest movements, and a **settings area where only إدارة التشغيل / الربط / رئيس المجلس edit lateness thresholds**.
6. **Linking (الربط) screen (mobile/desktop)** — 30-second form: choose clinic, optional note, urgent/normal → creates a request that appears for the courier manager, who assigns it to a courier in one tap. Time of request starts the full chain. WhatsApp remains an informal fallback.

## Domain rules

- **Unit of work = a run (دورة).** Branches get two runs a day: morning shift and evening shift. A run starts when the courier leaves the central lab and ends when he returns and hands the samples to الربط at the lab. A courier can do several runs a day (e.g. morning: التجمع → مدينة نصر → مصر الجديدة → شبرا → back to the lab, hand over to الربط, stay in the office; later cover some Giza branches or do a clinics run). One run = a chain of ordered stops (branches/clinics) between two lab visits.
- **Route templates** (~90% of days fixed) are per shift: the standard ordered stops for each courier's morning and evening run. Ad-hoc runs (covering Giza branches, a clinics run) are created by the courier manager from the same stops list, or from a clinic request.
- Daily deviations: a stop with no samples is skipped; a courier is substituted; the manager can add an urgent clinic stop to a run in progress. Substitution is per day, without editing the template.
- **Before the run leaves the lab**, today's courier phones each branch to ask if there are samples. The system replaces the phone call: each branch taps «العينات جاهزة» (or «مفيش عينات») ahead of the run, and the courier sees on the route which stops are ready, empty, or not yet confirmed (a stop not yet confirmed can be nudged by the manager).
- **Wait-at-branch clock:** starts at the branch's «العينات جاهزة» tap and stops at the courier's pickup tap. If a branch never taps, the stop is shown as "لم يؤكد الفرع" (an own flag), and the wait is not counted from the courier's arrival (that would measure the courier waiting for the branch). *(Derived from Mohamed's answer; the phone call exists today, the button is the replacement.)*
- Couriers: 10 total — 8 Cairo/Giza (13 Cairo/Giza branches + ~10 clinics), 1 Beni Suef (2 branches), 1 Fayoum (1 branch). Branches already exist in table `branches` (19 rows).
- Each stop step records timestamp + GPS at tap. If the GPS is more than ~150 m from the stop's coordinates at «وصلت», flag the event to the manager (our default, adjustable).
- **Sample counts**: branch enters on handover; courier confirms/edits; courier enters total at lab; lab confirms. Any mismatch between sums is flagged to the manager.
- **Lateness thresholds are configuration, not code.** Two thresholds at minimum: wait at branch before pickup, and handover time at the lab; optionally different per branch/area (Fayoum/Beni Suef are far). Edits restricted to the three management roles and audit-logged (who, when, old/new).
- Chain measured end to end: clinic request → assigned → courier arrived → samples received → left → arrived at lab → courier delivered → lab confirmed.
- Chat: manager ↔ each courier (1:1 threads) plus tasks. Real-time via Supabase Realtime.

## Location tracking

- **Button taps are the source of truth**; each tap stamps GPS. Free: browser Geolocation.
- **Live tracking** while the courier app is open: location ping about every minute, shown on the manager/management maps. Best effort: browsers stop GPS when the screen locks or the app is backgrounded. The design does not promise continuous tracking; a native app would be needed for that and is a non-goal.
- Prune ping history after ~30 days to stay within the Supabase free tier.
- Maps: Leaflet + OpenStreetMap tiles (no key, no cost). "From → to" is a straight line between points; no paid routing API. Branch coordinates (lat/lng) must be added to `branches`; clinics are a new table with coordinates.

## Look and feel

Light theme, brand green (#39B76E and the existing `--color-primary*` tokens), high contrast, large type, big thumb-sized buttons, readable in direct sunlight. Mockups (see `.superpowers/brainstorm/…/content/screens-v1.html`, `screens-v2.html`) were approved in direction ("حلو جدا"); they are rough, not final design.

## Goals

- Make waiting time at branches and lab handover visible and attributable.
- One tap per step for couriers and branch staff; no typing for couriers.
- Management sees live status and can tune thresholds themselves.
- Zero added running cost (Supabase free tier, OSM, browser GPS, PWA push if feasible).

## Non-goals

- Native app / guaranteed background GPS.
- Turn-by-turn navigation or paid routing/maps.
- Patient-facing features; changes to `sample_tracking`.
- Replacing WhatsApp entirely (kept as informal fallback).
- Payroll/performance scoring of couriers (not requested).

## Anti-goals (failure even if it "works")

- Couriers or branch staff find it slower than WhatsApp and stop using it.
- Unreadable in sunlight.
- Thresholds hard-coded so management can't change them.
- A branch account able to see other branches' data, or a courier able to edit another's records.

## Constraints

- Existing stack: React 19, Vite, react-router, Supabase (Auth, Postgres RLS, Realtime), Vercel hosting, PWA + an Android TWA already built. Arabic RTL, simple Egyptian-Arabic copy.
- Today branch accounts are not linked to a branch and "any authenticated user" has broad access to `sample_tracking`. New tables must use proper per-role/per-branch RLS; the branch↔account link must be created.
- Push notifications on courier phones only work if the PWA is installed; must be tested on the actual devices. Fall back to in-app badge + realtime when the app is open.

## Accounts (decided by Mohamed)

One shared account per branch, used on the branch's own computer (not a phone). Each courier has a personal account in his name. Lab reception and الربط use their own accounts. The branch↔account link and per-branch RLS are required; the branch screen must work well on a desktop browser, not only mobile.

## Decisions made by Mohamed

GPS and buttons both; thresholds set in the dashboard by operations/linking/chairman; include the الربط request screen from v1; the branch picks the courier and enters the count; both courier and lab reception record handover; light, polished, sun-readable UI.

## My calls (not yet confirmed by Mohamed)

Clinic and route master data loaded once by me, with an edit screen for the manager in phase 2; both branch and courier counts stored per stop, mismatches flagged and kept; tracking active only between the courier's «بدأت يومي» and «خلّصت يومي»; taps queued offline for Fayoum/Beni Suef and sent on reconnect; couriers told their location is recorded during work, ping history deleted after ~30 days; lab reception sees a queue of arrived couriers and confirms per courier-run with a count.

150 m arrival check; ping every ~1 minute and 30-day pruning; the branch count is mandatory; courier confirms the count; mismatch flags; per-area thresholds; straight-line map; manager can substitute couriers per day without editing templates; thresholds editable by the three management roles only.

## Left to the builder

Table design and RLS, exact phasing (suggest: data model + courier/branch flow → manager/management dashboard + thresholds → chat/tasks → الربط + lab reception), realtime/push approach, ping interval tuning, map component details, seeding routes and clinics, installation/onboarding for the 10 couriers.

## Open items (need data from Mohamed)

The actual list of clinics (names, locations), each courier's current route (ordered stops), branch coordinates, and the people/accounts for each role.
