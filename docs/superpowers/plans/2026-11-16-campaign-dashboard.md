# Campaign Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A standalone, free, local web tool where Mohamed types a campaign idea and gets a month plan plus copy-ready content (headline, caption, hashtags, panel text, image prompt) and a competitor comparison.

**Architecture:** Separate Vite + React app in `campaign-dashboard/` with its own `package.json` (the live app is never touched). Pure logic lives in `src/lib/*` (tested with Vitest); React components in `src/components/*` are thin. Data persists in `localStorage` with JSON export/import. A `ContentEngine` interface lets a Gemini/Claude API engine replace the bank engine later.

**Tech Stack:** React ^19.2, Vite ^8, Vitest + jsdom + @testing-library/react, plain CSS with custom properties, `@dnd-kit` is NOT used (native HTML5 drag and drop). Tajawal font (same as the app).

**Spec:** `docs/superpowers/specs/2026-11-16-campaign-dashboard-design.md`

## Global Constraints

- Separate folder `campaign-dashboard/`; do not modify anything under `src/`, `clients/`, `supabase/` of the live app.
- No API keys, no network calls, no paid services in v1.
- UI language Egyptian-friendly simple Arabic, RTL (`<html dir="rtl" lang="ar">`), light tone, few emojis.
- UI theme (Mohamed's ruling 2026-11-16): WHITE background, fresh new palette, NOT Trust Labs green: violet `#6C5CE7`, coral `#FF6B6B`, mint `#2EC4B6`, sunny `#FFB703`, sky `#4CC9F0`. Trust Labs green `#39B76E` appears only inside the image prompt text.
- Image prompt: aspect ratio exactly 4:5 (1080x1350); generates image + frosted panel text only.
- The image prompt must never contain the hotline `16183`, the website, or the Arabic brand spelling `تراست`, and must contain the rule "No logo".
- Panel text = 1 service line + exactly 4 bullets. Headline is 2-3 words (warn, do not block, if more).
- Platforms: `facebook`, `instagram` on by default; `tiktok` optional and off. Post types: `post`, `reel`, `carousel`, `story`.
- Data schema carries `schemaVersion: 1`.
- Do not commit anything outside `campaign-dashboard/` and `docs/superpowers/`.

## Review Focus

- First launch with empty or blocked `localStorage` → app renders with empty state, no crash.
- Importing corrupt JSON or an unknown `schemaVersion` → clear Arabic error, existing data untouched.
- A post with fewer or more than 4 bullets, or a headline over 3 words → visible warning, copy still works.
- Duplicate-idea detection with Arabic diacritics, tatweel, and أ/إ/آ vs ا variants → still detected as similar.
- Clipboard API unavailable (page opened over `file://` or denied) → fallback copy works and tells the user.
- Month lengths 28-31 days and dragging a post onto an empty or out-of-month day → plan stays valid.

---

### Task 1: Scaffold, test harness, theme tokens

**Files:**
- Create: `campaign-dashboard/package.json`, `vite.config.js`, `index.html`, `src/main.jsx`, `src/App.jsx`, `src/styles/theme.css`, `src/App.test.jsx`

**Interfaces:**
- Produces: `App` default export rendering a header with the text `داشبورد الحملات`; CSS variables `--bg` (#FFFFFF), `--brand` (violet), `--brand-light`, `--c-coral`, `--c-mint`, `--c-sun`, `--c-sky`, `--radius`, `--shadow-soft` on `:root`.

- [ ] **Step 1: Write the failing test** in `src/App.test.jsx`: renders `<App />` and expects `screen.getByText('داشبورد الحملات')`, and `document.documentElement.dir === 'rtl'`.
- [ ] **Step 2:** Run `cd campaign-dashboard && npx vitest run` → Expected: FAIL (no app).
- [ ] **Step 3:** Create the project (scripts `dev`, `build`, `test`; deps react/react-dom, dev deps vite, @vitejs/plugin-react, vitest, jsdom, @testing-library/react), set `dir="rtl"` in `index.html`, define theme tokens, Tajawal font via the same files the app already ships (copy the font files used by `src/styles/typography.css` into `campaign-dashboard/public/fonts/`).
- [ ] **Step 4:** Run `npx vitest run` → Expected: PASS. Run `npm run build` → Expected: builds with no errors.
- [ ] **Step 5: Commit** `git add campaign-dashboard && git commit -m "feat(campaign-dashboard): scaffold app, theme tokens, test harness"`

---

### Task 2: Image prompt template

**Files:**
- Create: `campaign-dashboard/src/lib/promptTemplate.js`, `src/lib/promptTemplate.test.js`

**Interfaces:**
- Produces: `buildImagePrompt(p: { concept: string, subject: string, mood: string, accent: string, serviceLine: string, bullets: [string,string,string,string] }): string` and `validateBullets(bullets: string[]): { ok: boolean, message?: string }`.

- [ ] **Step 1: Write failing tests:** (a) output contains `4:5`, `1080x1350`, `#39B76E`, the exact `serviceLine` and each bullet; (b) output contains `No logo` and does NOT contain `16183`, `trustlabseg`, `تراست`; (c) output states the bottom 14% is clear and the only text is inside the panel; (d) output includes the medical-accuracy rule (blue gloves, tourniquet, inner elbow, five fingers); (e) `validateBullets` rejects 3 and 5 bullets with an Arabic message and accepts 4.
- [ ] **Step 2:** Run `npx vitest run src/lib/promptTemplate.test.js` → Expected: FAIL.
- [ ] **Step 3:** Implement both functions, using the final template text from the conversation (kept as one constant string with `${}` slots; rules block is fixed, never user-editable).
- [ ] **Step 4:** Run the same command → Expected: PASS.
- [ ] **Step 5: Commit** `feat(campaign-dashboard): image prompt template with fixed brand rules`

---

### Task 3: Storage with safe import/export

**Files:**
- Create: `src/lib/storage.js`, `src/lib/storage.test.js`

**Interfaces:**
- Produces: type `Db = { schemaVersion: 1, posts: Post[], ideas: Idea[], settings: { platforms: string[], timesByPlatform: Record<string,string[]> } }`; `emptyDb(): Db`; `loadDb(): Db` (never throws); `saveDb(db: Db): boolean`; `exportDb(db: Db): string`; `importDb(text: string): { ok: true, db: Db } | { ok: false, error: string }`.
- `Post` shape: `{ id, ideaId, type, platform, date: 'YYYY-MM-DD', time: 'HH:mm', headline, caption, hashtags: string[], panelService, panelBullets: string[], image: { concept, subject, mood, accent }, status: 'idea'|'ready'|'published' }`.

- [ ] **Step 1: Write failing tests:** `loadDb` returns `emptyDb()` when storage is empty, holds invalid JSON, or `localStorage` access throws; `saveDb` returns `false` (no throw) when storage throws; `importDb('{bad')` → `{ok:false}` with an Arabic error; `importDb` with `schemaVersion: 2` → `{ok:false}`; `exportDb` → `importDb` round-trips equal.
- [ ] **Step 2:** Run → Expected: FAIL.
- [ ] **Step 3:** Implement with a try/catch around every storage access and a structural validator (required keys and types, status/type/platform enums).
- [ ] **Step 4:** Run → Expected: PASS.
- [ ] **Step 5: Commit** `feat(campaign-dashboard): safe localStorage persistence and JSON import/export`

---

### Task 4: Month planner and duplicate-idea detection

**Files:**
- Create: `src/lib/planner.js`, `src/lib/similarity.js`, tests for both.

**Interfaces:**
- Produces: `buildMonthPlan(o: { year: number, month: number /*1-12*/, mix: { post: number, reel: number, carousel: number, story: number }, platforms: string[], timesByPlatform: Record<string,string[]> }): { date: string, type: string, platform: string, time: string }[]` — spreads items evenly, never two of the same type on the same day, all dates within the month.
- `movePost(posts: Post[], id: string, newDate: string): Post[]` — returns a new array; if `newDate` is outside the post's original month, returns the input unchanged.
- `normalizeArabic(s: string): string` (remove diacritics and tatweel, unify أإآ→ا, ى→ي, ة→ه, lowercase Latin) and `similarity(a: string, b: string): number` (token Jaccard on normalized text, 0-1); `findSimilarIdeas(idea: string, existing: string[], threshold = 0.6): string[]`.

- [ ] **Step 1: Write failing tests:** plan for Feb 2027 (28 days) and Dec 2026 (31 days) has the exact total of `mix` and every date inside the month; no same type twice per day; `movePost` to a date in another month is a no-op; `similarity('قَلبك مش لعبة','قلبك مش لعبه') > 0.9`; `findSimilarIdeas` flags "أنقذ قلبك" vs "انقذ قلبك" and ignores unrelated ideas.
- [ ] **Step 2:** Run → Expected: FAIL.
- [ ] **Step 3:** Implement. Planner: distribute by index across days with a deterministic stride; no randomness (tests must be stable).
- [ ] **Step 4:** Run → Expected: PASS.
- [ ] **Step 5: Commit** `feat(campaign-dashboard): month planner, drag-move rule, duplicate idea detection`

---

### Task 5: Content engines (bank + chat prompt)

**Files:**
- Create: `src/lib/engine.js`, `src/lib/engine.test.js`

**Interfaces:**
- Produces: `ContentEngine = { id: string, generate(input: { idea: string, month: string, mix: object }): Promise<Post[]> }`; `bankEngine(db: Db): ContentEngine` (returns posts already in the bank whose idea matches, else `[]`); `buildChatPrompt(o: { idea: string, month: string, mix: object, competitors: Competitor[], insights: string[] }): string` — the "copy command" text for ChatGPT/Gemini/Claude, containing the brand voice, the JSON shape that `importDb` accepts for `posts`, competitor summary, and the rules from Global Constraints.
- Consumes: `Db`, `Post` (Task 3).

- [ ] **Step 1: Write failing tests:** `buildChatPrompt` contains the idea, the month, every competitor name passed, `"schemaVersion": 1`, and the rule "no medical promises"; `bankEngine(emptyDb()).generate(...)` resolves `[]`.
- [ ] **Step 2:** Run → Expected: FAIL. **Step 3:** Implement. **Step 4:** Run → Expected: PASS.
- [ ] **Step 5: Commit** `feat(campaign-dashboard): swappable content engine, bank engine and chat prompt builder`

---

### Task 6: Seed data (competitors, hashtags, sample month)

**Files:**
- Create: `src/data/competitors.json`, `src/data/hashtags.json`, `src/data/seedMonth.json`, `src/data/seed.test.js`

**Interfaces:**
- Produces: `Competitor = { name, instagram?: string, facebook?: string, sample: { posts: number, avgLikes: number, notes: string, dataQuality: 'ok'|'old'|'missing' } }`; hashtag groups keyed by category (`heart`, `thyroid`, `pregnancy`, `general`, ...); `seedMonth.json` = a valid `Db` with a blood-pressure campaign (the "أنقذ قلبك" / "قلبك مش لعبة" ideas) and 8-12 posts.

- [ ] **Step 1: Write failing test:** `importDb(JSON.stringify(seedMonth)).ok === true`; every seed post has exactly 4 bullets and a headline of at most 3 words; competitors list has the 9 names from the spec; the five with fetched data have `dataQuality`, the rest `missing`, Alfa `old`.
- [ ] **Step 2:** Run → Expected: FAIL. **Step 3:** Write the data using only the numbers in spec §6 (no invented metrics; leave `avgLikes` null-safe where unknown). **Step 4:** Run → Expected: PASS.
- [ ] **Step 5: Commit** `feat(campaign-dashboard): seed competitors, hashtags and sample campaign`

---

### Task 7: Shell, idea form, post card with copy

**Files:**
- Create: `src/components/CopyButton.jsx`, `IdeaForm.jsx`, `PostCard.jsx`, `src/lib/clipboard.js`, tests; Modify: `src/App.jsx`

**Interfaces:**
- Produces: `copyText(text: string): Promise<{ ok: boolean, fallback: boolean }>` (uses `navigator.clipboard`, falls back to a hidden textarea + `execCommand('copy')`); `<CopyButton text label />` shows a confirmation for ~1.5s; `<IdeaForm onSubmit({idea,month,mix}) />` warns via `findSimilarIdeas`; `<PostCard post onChange />` shows headline, caption, hashtags, panel service + 4 bullets, image prompt (built by `buildImagePrompt`), each with a CopyButton, plus warnings from `validateBullets` and the 3-word headline check.
- Consumes: Tasks 2, 3, 4, 5.

- [ ] **Step 1: Write failing tests:** `copyText` uses fallback when `navigator.clipboard` is undefined and returns `{ ok: true, fallback: true }`; `PostCard` shows a warning when bullets ≠ 4 and still renders the copy buttons; `IdeaForm` shows a similar-idea warning for a diacritic variant of an existing idea.
- [ ] **Step 2:** Run → Expected: FAIL. **Step 3:** Implement components; App loads `loadDb()` and falls back to the seed month on first launch when the db is empty. **Step 4:** Run → Expected: PASS.
- [ ] **Step 5: Commit** `feat(campaign-dashboard): idea form and copy-ready post cards`

---

### Task 8: Interactive month calendar

**Files:**
- Create: `src/components/MonthCalendar.jsx`, `MonthCalendar.test.jsx`, `PlanSettings.jsx`; Modify: `src/App.jsx`

**Interfaces:**
- Produces: `<MonthCalendar year month posts onMove(id,newDate) onSelect(id) />` (native drag-and-drop; also keyboard "move to previous/next day" buttons for accessibility); `<PlanSettings settings onChange />` for choosing platforms and post times per platform.
- Consumes: `movePost`, `buildMonthPlan` (Task 4).

- [ ] **Step 1: Write failing tests:** a 28-day month renders 28 day cells; firing drop of a post onto another day calls `onMove` with that date; the "next day" button on the last day of the month does not call `onMove`.
- [ ] **Step 2:** Run → Expected: FAIL. **Step 3:** Implement, color-coding by post type. **Step 4:** Run → Expected: PASS.
- [ ] **Step 5: Commit** `feat(campaign-dashboard): drag-and-drop month calendar and plan settings`

---

### Task 9: Competitors panel, idea bank, import/export UI, chat-prompt button

**Files:**
- Create: `src/components/CompetitorsPanel.jsx`, `IdeaBank.jsx`, `DataMenu.jsx`, `ChatPromptButton.jsx`, tests; Modify: `src/App.jsx`

**Interfaces:**
- Produces: `<CompetitorsPanel competitors />` (cards per competitor with data-quality badge, plus a "gap and how we win" box from `insights: string[]` taken from spec §6); `<IdeaBank ideas posts onReuse />`; `<DataMenu db onImport(db) />` (export file download, import via file input, shows Arabic errors from `importDb`); `<ChatPromptButton idea month mix />` copies `buildChatPrompt(...)`.
- Consumes: Tasks 3, 5, 6, 7.

- [ ] **Step 1: Write failing tests:** corrupt import file shows the Arabic error and does not call `onImport`; `CompetitorsPanel` shows a "ناقصة" badge for `dataQuality: 'missing'` and "قديمة" for `'old'`; `ChatPromptButton` copies text containing the idea.
- [ ] **Step 2:** Run → Expected: FAIL. **Step 3:** Implement. **Step 4:** Run → Expected: PASS.
- [ ] **Step 5: Commit** `feat(campaign-dashboard): competitors panel, idea bank, data menu and copy-command button`

---

### Task 10: Polish and live verification

**Files:**
- Modify: `src/styles/theme.css`, component styles; Create: `campaign-dashboard/README.md` (Arabic quick-start: run, import monthly file, copy-prompt workflow)

- [ ] **Step 1:** Add soft entrance animations (white, light, playful), hover lift on cards, copy confirmation pop, drag-over highlight; respect `prefers-reduced-motion` (disable animations).
- [ ] **Step 2:** Add a `launch.json` entry or run `npm run dev --prefix campaign-dashboard`; verify in the browser at desktop width and 375px width: no horizontal scroll, RTL layout correct, calendar usable, copy buttons work, console has no errors.
- [ ] **Step 3:** Run `npx vitest run` (all pass) and `npm run build` (no errors).
- [ ] **Step 4: Commit** `feat(campaign-dashboard): theme polish, README and verification`
