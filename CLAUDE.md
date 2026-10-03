# Trust Labs App — context for Claude

Read this first. It records what exists, what was decided and why, and what is still open,
so a new session can pick up where the last one stopped. Keep it current: when you finish
something or a decision changes, update the relevant section in the same PR.

**Talk to the user (Mohamed Rwash, marketing & graphic design at Trust Labs) in Egyptian Arabic.**
He is not a developer: explain in plain words, show what changed for customers/staff, and ask
before anything that changes the live site or the production database.

## What this is

Patient-facing PWA for Trust Labs (معامل ترست), a medical lab with 19 branches in Egypt.
React + Vite, Supabase (DB, auth, edge functions), deployed on Vercel from `main`.

- Live app: https://app.trustlabseg.com (admin at `/admin`)
- Supabase project: `thghrkzeyfinbspaascz` ("Trust Labs App", org `wrvxwnvajospluatkpua`).
  The Supabase connector must be authorized for that org, or the project won't be visible.
- Vercel project: `trust-labs-app` (`prj_PkQNz2YCcRAf7BPh8u8ZHnEL0wf4`, team `rwash1`). Every PR gets a
  preview; merging to `main` deploys production. Preview deployments use the **real** database.
- Trust Lab Ops = the internal ERP run by the user's colleague (operations manager). Bookings and
  visit ratings are forwarded there by pg_net triggers → edge functions
  (`forward-booking-to-erp`, `forward-visit-rating-to-erp`, see `supabase/visit_ratings_forward_trigger_migration.sql`).

## Workflow that has worked

- Branch → build (`npm run build`) → `npx oxlint` (19 pre-existing warnings; don't add new ones) →
  test in headless Chromium with Supabase mocked → PR → the user says «ادمج» → merge → check the
  Vercel production deploy is READY.
- DB changes: write `supabase/<name>_migration.sql`, test it on the live DB **inside a transaction that
  rolls back**, then apply with the Supabase connector (`apply_migration`). Migrations are applied by
  hand; there is no migration runner. Every migration in `supabase/` listed below is already applied.
- Never commit secrets. The ERP forward secret lives in the trigger SQL on the server; the repo copy
  uses a `<FORWARD_WEBHOOK_SECRET>` placeholder.

## Roles and permissions

- Admin = `app_metadata.role = 'admin'` (the user's account). Sees `/admin` with all tabs.
- `samples@trustlabseg.com` = customer service / branches, no role. Sees `/admin/samples` with two tabs:
  تتبع العينات and شكاوى واقتراحات (read + change status only; delete and editing text are blocked in the
  DB by `supabase/complaints_staff_permissions_migration.sql`).

## Done (all merged and live)

| PR | What |
|---|---|
| #2 | Phone validation everywhere (`src/lib/phone.js`: real Egyptian mobiles, rejects filler like 01012345678; mirrored in the chat edge function and DB CHECK constraints via `phone_validation_migration.sql`). Rate-visit: judged by the lowest answer (😡/😞 anywhere → phone required + auto complaint; 😐 → asks what to improve, admin "محتاج متابعة"), big branch buttons, green SVG heart. Trust Card: price 250 (editable in admin, `app_settings`), «لنفسي / لشخص تاني» with four-part name + relationship. Deployed-only ERP code brought into git. |
| #3 | Trust Card orders saved in `trust_card_requests` (admin-only read; price stamped by DB trigger), orders list in admin tab «كارت الثقة». Formspree email kept as backup. |
| #4 | Complaints tab for the samples@ account, no delete (see Roles). |
| #5 | Admin «📊 تقارير»: one Excel file for a date range (`src/lib/reports.js`, exceljs loaded on demand, excluded from PWA precache): summary, most/never requested tests, and detail sheets. Phones masked unless the admin ticks "full numbers". |
| #6 | In-branch QR campaign tracking: `?b=<branch slug>&p=<spot>` recorded in `qr_scans` (`src/lib/qrTracking.js`, slugs in `src/data/branchSlugs.js` — never rename a slug after printing). Report shows scans by branch/spot. Rate-visit offers the scanned branch first. |

## In-branch campaign «أعرف عينتك فين من موبايلك» (current work)

- Strategy report (artifact, private to the user): https://claude.ai/artifact/84wh8xXsxEtKmgFQEcjha8
- Plan: pilot in 3 branches for 2 weeks, then all 19. Placements per branch: reception stand (counter),
  waiting-area A2 poster (poster), table card with launch offer (table → /booking), receipt sticker
  (receipt → /track-sample), exit card (exit → /rate-visit).
- Print files are generated, not stored: `node scripts/campaign/qr-codes.mjs` (95 codes + index CSV) and
  `node scripts/campaign/poster-a2.mjs [slug…]` (A2 PDFs, brand font Tajawal + logo). Output goes to
  `scripts/campaign/out/` (git-ignored). The headline spelling «أعرف» (with hamza) is the user's choice.
- Status: the A2 poster for all 19 branches is done and approved. **Not designed yet:** reception stand,
  table card, receipt sticker, exit card.
- Before printing: the user should print one A4 test and scan it with a phone.
- Risks written in the strategy report: sample tracking only works if branches register each sample
  with the patient's phone (only 2 samples existed on 2026-09-27); the app isn't in app stores (materials
  say «امسح الكود — من غير تحميل»); the results portal link is http (`webresults.trustlabseg.com`) and
  trustlabseg.com was compromised in May 2025 per `Trust_Labs_App_Handoff.md`.

## Open / postponed (the user chose to wait)

- The samples@ account can still read and edit **bookings** and read **ratings** through the API
  (the UI doesn't show them). Fix = admin-only policies, like complaints.
- Complaints from the complaints page and the chat don't reach the ERP (ratings and bookings do).
  Needs a complaints webhook URL from the colleague (like `receive-booking-webhook` / `receive-survey-webhook`).
- Move the ERP forward secret out of the trigger SQL into Supabase Vault, then rotate it.
- Test data from 2026-09-22/27 (4 test bookings, some ratings/complaints) is still in the DB; the user
  said to keep it for now.
