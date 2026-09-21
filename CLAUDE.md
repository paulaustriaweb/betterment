# Betterment — Project Context (final basis)

> This file is the single source of truth for this project. If a session runs out of context, read this file first — it contains everything needed to pick up where the last session left off. Supersedes any earlier prototype notes.

---

## 0. Rules for the AI agent — read this section every session

These are standing behavioral rules, not suggestions.

1. **Stay in the code.** Your job is implementation. Don't write planning documents, alternative-approach surveys, or "here's what I did" essays unless explicitly asked. Don't add scope beyond what's requested. If you think something's missing, say one line and ask — don't build it speculatively.
2. **Explain code caveman-style.** When explaining what code does, be short and blunt. Optimize for token cost, not politeness or completeness.
   - Bad: "This function is responsible for calculating the number of unaccounted hours by iterating through the day's time blocks and subtracting..."
   - Good: "Loop sums logged minutes. 1440 minus that = gap."
   - No preamble, no restating the question, no "Let me explain..." No trailing summary after a code change — the diff speaks for itself.
3. **One tab fully working before starting the next.** No half-finished screens. Don't scaffold all four tabs' UI shells before any of them actually reads/writes SQLite.
4. **Verify persistence.** After any schema or write-path change, confirm data survives an app reload before moving on. This is the single most common silent failure mode in Expo + SQLite apps.
5. **Expo Go only.** Every package must run in Expo Go — no custom dev client, no native module linking, no `expo prebuild` requirement. If a library needs that, reject it and find another.
6. **Plain code over clever code.** Future sessions (possibly a fresh AI with no memory of this one) have to read and debug this. No cleverness tax.
7. **Files stay short.** Split before a file becomes unwieldy. Small, single-purpose modules.

---

## 1. What this is

A personal iOS time and money tracker, built by one person for their own nightly use, designed cleanly enough that anyone could clone it and run it for themselves.

**Scope resolution (decided 2026-09-21):** stays single-user and fully offline exactly as originally scoped — no accounts, no multi-profile switching, no login. "Usable by anyone" is satisfied through *portability*, not multi-tenancy: no hardcoded personal data, currency and categories are configurable rather than baked in, and the repo ships with a real README so a stranger could `expo start` this on their own phone. This is also explicitly a **portfolio piece** — code quality, structure, and presentation matter, not just working nightly for one person.

**The core problem:** hours disappear without a trace. Days blur, late nights happen, and there's no honest record of where time actually went. Money causes background anxiety because spending isn't tracked either.

**The bet:** making unaccounted time *visually* uncomfortable — a gray gap on a bar, not a broken streak — creates more pressure than gamification. No checkboxes, no streaks, no "well done!" screens. Just an honest bar.

---

## 2. Hard constraints (real, not stylistic — do not relitigate these)

- **Target platform: the web build, installed to the iPhone home screen.** Decided 2026-09-22.
  Expo Go was the original target and is still the **development** environment (`npx expo start`),
  but it can't be the shipping one: it needs a dev server on the same network, so the app can't be
  used away from the computer and can't be installed by anyone else. The shipping path is
  `npx expo export --platform web` → free static host → Safari → Add to Home Screen. See §13 for
  the reasoning, the tradeoffs accepted, and the one question that still has to be answered.
- No Mac, no Apple Developer account, no standalone iOS build, no App Store. Unchanged.
- **Free.** No paid services, no hosting, no subscriptions, no cloud DB.
- **Offline-first.** Works with zero network access. No accounts, no login, no sync.
- **Deadline: September 27, 2026.**

### Timeline
The original 18-day plan assumed a Sept 9 start that never happened. It was replaced with a
six-day plan on Sept 21, and that plan was finished the same day — see §10. All five tabs are
built, so the remaining days are slack. Spend them on §12 and §13, not on new features.

---

## 3. Design system

**Direction: Soft Blush — locked 2026-09-21.** Light, warm, pink. Earlier dark explorations are dead; don't revive them.

Full reference: **canvas — "Betterment — UI Direction"**, artifact `9j87CxXNxa9iK6aAWXZqTw`. Under the *"Final system — Soft Blush"* heading you'll find Overview, Agenda, Log, Money, Goals, plus three spec boards: **Design tokens — final**, **States & feedback**, and **Motion & microinteractions**. The screens are clickable prototypes, not pictures — match them, don't reinterpret them.

`src/lib/colors.ts` is the code mirror of the tokens board. If they ever disagree, the board wins and the file gets fixed.

### Palette
```
ground     #FBEDF1   app background (warm blush — NOT white; cards float on it)
surface    #FFFFFF   cards, tab bar
ink        #2B1F24   primary text, dark "Logged" cards
inkSoft    #6B5A61   secondary text — AA-safe on ground, don't go lighter for text
inkFaint   #9E8B92   inactive icons only, never body text
line       #F5DFE6   hairlines, dividers
rose       #C43C6E   primary action, hero card fill
roseDeep   #9E2A55   pressed state, text on tinted backgrounds
rosePop    #F84E88   highlight — today's bar, "Longest gap" card, accents
roseTint   #FFE3EC   chip fills, soft banners
gap        #F2E4E8   unlogged time on bars — this color IS the product's core idea
danger     #A63232   destructive actions, errors (deliberately not pink)
```
Category colors — each is a triple (`dot` for bars/markers, `fill`+`text` for agenda blocks and category cards). Every fill/text pair clears 4.5:1:
```
Work / Freelance  dot #5271C4  fill #DCE4F7  text #2E4488
Study / School    dot #8663C4  fill #E8DEF7  text #5B3A9E
Reading           dot #4E9B77  fill #D9EFE3  text #256247
Sleep             dot #5E6BA8  fill #DFE2F2  text #3A4680
Gaming            dot #CE9440  fill #FBEBD2  text #7E5312
Scrolling         dot #4C9A96  fill #D7EDEB  text #2A6B68
Watching          dot #C97361  fill #FADFD9  text #8F3C2A
Other             dot #93858A  fill #EDE7E9  text #5C4F54
```
Type: **Instrument Sans** via `@expo-google-fonts/instrument-sans`. Scale, radii, spacing and elevation live in `src/lib/colors.ts` and on the tokens board. All numerals use `tabular-nums` so times don't jitter while steppers run.

No gradients, no glassmorphism, no emoji-as-icons, no Inter/Roboto. Plain 2px-stroke line icons via `react-native-svg`.

### Layout language
Bento: one wide hero card, then split half-cards, then a grid or list. Cards sit on the tinted ground with generous radii (24) and very tight shadows — depth comes from *value contrast* between cards (rose / ink / pop / white), never from heavy blur.

### Density & disclosure (see the "Density & disclosure" board)
Whitespace is a component, not leftover room — it's what makes the one display number readable.
- **Five blocks per screen, maximum:** header · hero · one supporting group · one entry point · one action. A sixth block means something belongs behind disclosure.
- **One question per screen.** Overview answers "how much is missing?". "Missing from what?" is a *different* question — it opens a sheet.
- **Nothing below the fold** on the five primary screens. If it doesn't fit, it moves into a sheet — never shrink type or gaps to make room.
- **Summary + one insight.** Show the total and the single most useful line ("Sleep leads at 29%"); the full breakdown is one tap away.
- **Sheets, not screens,** for anything you'd immediately back out of: category breakdown, add expense, add goal, quick-log from an agenda gap, settings/export.
- **Optional input starts collapsed.** Note and preview on Log are one-line rows until tapped, so nothing competes with duration → time → category → save.
- **Slack collects in one place:** the primary action uses `marginTop: 'auto'` so empty space pools above it instead of leaking between rows.
- Spacing scale: 26 top inset · 18 side rail · 11 between sibling cards · 15–18 between groups · 16–20 card padding.

### Hierarchy law (see the "Hierarchy law" board — treat these as review criteria, not vibes)
Six text levels exist. No screen invents a seventh.

| | Level | Rule |
|---|---|---|
| L1 | Display 42/700 | **Exactly one per screen** — that screen's whole thesis (unaccounted hours, net, days left). Never two. |
| L2 | Stat 25/700 | Inside cards only. Two or three per screen, never more. |
| L3 | Title 23/700 | Screen name. Always top-left, same position on every page. |
| L4 | Body 13/500 | Content rows — the only level allowed to repeat many times. |
| L5 | Label 11.5/600 | Card labels, always paired with an icon chip so it reads as a header. |
| L6 | Caption 10.5/400 | Support only. Never the sole home of information the user needs. |

- **Weight before size.** 700 numbers/titles · 600 labels/actions · 500 body · 400 captions. Two levels never share both a size and a weight.
- **Color reinforces rank**, never replaces it: `ink → inkSoft → inkFaint` follows the same ladder.
- **One 18px rail.** Every title, label and row starts on the same left edge. Nothing is centered except empty states.
- **Hero → split → detail** on every screen, so scanning habits carry across tabs.
- **One rose surface above the fold.** Two rose cards means neither is emphasis.
- **Numbers right, names left**, figures in `tabular-nums` so values form a readable column.
- **Size only decreases going down a screen.** A bigger thing below a smaller thing means the hierarchy broke — treat it as a bug.

### Interaction patterns (prototyped in the canvas — port these, don't reinvent)
- **Range pills** (Overview, Money): tap switches every stat, the sparkline and the grid at once. Numbers count to their new value rather than snapping.
- **Agenda gaps:** unlogged stretches render as **dashed, tappable blocks** labelled "2h 30m unaccounted — tap to log" that route to Log pre-filled. This is the single most important interaction in the app — the product's premise as a button.
- **Log steppers:** duration is the primary control (−/+ 15m), start has its own steppers, end is derived. "End now" snaps to the current time. The preview bar and overlap banner update live as you adjust.
- **Category chips:** horizontal snap-scroll (`ScrollView horizontal` + `snapToInterval` + `decelerationRate="fast"`), selected = ink fill + pop dot, with `Haptics.selectionAsync()`.
- **Goals check:** circle fills, check draws, row strikes and animates down to Completed (`LayoutAnimation` or Reanimated — never teleport).
- **Undo over confirm:** destructive-looking actions complete immediately and offer **Undo in a toast** (6s). Only genuinely destructive deletes get a confirm sheet. See the States board.
- **Day bar / agenda / sparkline:** plain `<View>` flex-proportioned segments and inline `react-native-svg` polylines. No chart library — still a hard requirement.

### Motion
Four durations only: **90 / 160 / 240 / 320ms**. Standard easing `cubic-bezier(.2,.8,.2,1)` in, `(.4,0,1,1)` out; springs for sheets and toasts. Honor **Reduce Motion** by collapsing everything to a 120ms opacity cross-fade — the now-line pulse stops entirely, and no layout ever depends on an animation finishing. Per-element specs are on the Motion board.

---

## 4. Architecture

### Stack
| Layer | Choice | Why |
|---|---|---|
| Framework | React Native via Expo, **TypeScript strict mode** | catches the date-math bugs this app lives or dies on |
| Navigation | expo-router (bottom tabs) | file-based, matches the 4-tab structure exactly |
| Database | expo-sqlite | local, on-device, no server |
| State | React state + small custom hooks per domain — **no Redux, no Zustand, no react-query** | app is 4 tabs and a handful of tables; a library here is weight with no payoff |
| Notifications | expo-notifications (local only) | |
| Dates | date-fns | |
| Charts | Custom `<View>`-based bars — confirmed by the mockup, no library needed | |
| Haptics | expo-haptics | free tactile polish, Expo Go compatible |
| Testing | Jest, logic only (no component tests at this scope) | |
| Lint/format | ESLint + Prettier | |

**Explicitly NOT using:** Node/Express (no server — the app talks to SQLite directly), Firebase/Supabase/any cloud DB, Redux/Zustand/react-query (state needs don't justify them here).

### Folder structure
```
src/app/                    expo-router routes (thin — screens compose components + hooks)
  (tabs)/index.tsx           Overview
  (tabs)/agenda.tsx          Agenda (vertical timeline + tappable gaps)
  (tabs)/log.tsx             Log
  (tabs)/money.tsx           Money
  (tabs)/goals.tsx           Goals
src/
  db/
    client.ts                expo-sqlite connection, single instance
    migrations.ts             ordered migration list, PRAGMA user_version runner
    timeBlocks.ts             typed queries: insert/update/delete/listByDay/listByRange
    transactions.ts           typed queries
    goals.ts                  typed queries
    settings.ts               get/set typed key-value (currency, reminder time, etc.)
  hooks/
    useTimeBlocks.ts           reads + exposes mutate fns; re-fetches after writes
    useTransactions.ts
    useGoals.ts
    useSettings.ts
  lib/
    time.ts                   pure: unaccountedHours(), detectOverlap(), formatDuration()
    currency.ts                pure: formatCurrency(amount, code) — no hardcoded ₱ in components
    colors.ts                  design tokens from Section 3, one source of truth
  components/
    DayBar.tsx, WeekBars.tsx, CategoryChip.tsx, StatCard.tsx, GoalCard.tsx, TabBarIcon.tsx
  constants/
    categories.ts              seed data for first run (id, name, color, is_active)
```

### State pattern (no library, and here's exactly how that stays sane)
Each domain hook (`useTimeBlocks`, etc.) queries SQLite on mount, exposes the data plus mutation functions (`add`, `update`, `remove`), and after any mutation increments a tiny shared counter (React Context, one `number`, call it `dbVersion`) that other hooks watching the same table depend on in their `useEffect` — so a write in the Log tab shows up next time Home re-renders, without a query library. ~30 lines total. If this ever gets genuinely painful, revisit with `@tanstack/react-query` (Expo Go compatible, not banned — just unnecessary at this size).

### Schema migrations (new — not in the original prototype notes)
This app is meant to hold a year+ of nightly data. The schema **will** change (Phase 2 features are already planned). Use SQLite's `PRAGMA user_version` plus an ordered array of migration functions run at startup:
```ts
const migrations: ((db: SQLiteDatabase) => void)[] = [
  (db) => db.execSync(`CREATE TABLE categories (...)`),
  (db) => db.execSync(`CREATE TABLE time_blocks (...)`),
  // ...
];
// on startup: read PRAGMA user_version, run every migration after it in order, bump the pragma
```
Never edit a migration that's already shipped — append a new one. This is the actual defense against losing a year of logs to a schema change; JSON export (Section 8) is a second, independent layer of protection, not a replacement for this.

### Data model
```sql
categories (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  is_active INTEGER DEFAULT 1
);

time_blocks (
  id INTEGER PRIMARY KEY,
  start_time TEXT NOT NULL,   -- ISO 8601, local time
  end_time TEXT NOT NULL,
  category_id INTEGER NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);
CREATE INDEX idx_time_blocks_start ON time_blocks(start_time);

transactions (
  id INTEGER PRIMARY KEY,
  type TEXT NOT NULL,         -- 'expense' | 'income'
  amount REAL NOT NULL,
  category TEXT,
  source TEXT,
  note TEXT,
  date TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_transactions_date ON transactions(date);

goals (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  deadline TEXT NOT NULL,
  is_complete INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
-- seeded on first run: currency='PHP', reminder_time='23:30'
```
Timestamps: ISO 8601 strings, local time. Amounts: plain `REAL`, no currency symbol stored — `settings.currency` drives display formatting via `lib/currency.ts`. This is what makes the app portable without adding real multi-user complexity: someone else clones it, changes one setting, done.

### Error handling
Every SQLite write wrapped in try/catch. On failure: don't fail silently — surface a small inline banner ("Couldn't save — try again"), log the error. This directly targets the failure mode the original notes already flagged as the most common silent bug in Expo+SQLite apps.

### Testing
Jest, logic-only, no component/UI test harness (not worth the setup cost at this scope/timeline):
- `lib/time.ts` — `unaccountedHours()`, `detectOverlap()` (these are the two functions where an off-by-one ruins the entire premise of the app)
- `lib/currency.ts` — `formatCurrency()`

---

## 5. Features (v1)

Five tabs: **Overview · Agenda · Log · Money · Goals.**

### Tab 1 — Overview
- Range pills (Today / This week / This month) driving every number on the screen
- Hero card: "Xh unaccounted" as the single most prominent number, with a 7-point sparkline
- Split cards: "Logged" (ink) and "Longest gap" (pop)
- "Where it went" 2×2 category grid, with Unaccounted as the fourth, rose card

### Tab 2 — Agenda
- Month header, week date strip, vertical hour-gridded timeline with a live now-line
- Logged blocks in category fill+text colors
- **Gaps render as dashed, tappable "Nh unaccounted — tap to log" blocks** that route to Log pre-filled

### Tab 2 — Log
- Add a time block: start, end, category (swipeable chip picker), optional note
- Start defaults to the end of the last logged block
- Edit/delete existing blocks
- Overlap warning, non-blocking
- Today's blocks list below the form

### Tab 3 — Money *(cuttable if Section 10's 6 days run out)*
- Add expense/income: amount, category or source, date, note
- Monthly totals: spent / earned / net
- Expenses/Income segmented list, most recent first

### Tab 4 — Goals *(cuttable if Section 10's 6 days run out)*
- Add goal + deadline, countdown in days, sorted nearest-first
- Tap to mark complete (animates to Completed section)

### Nightly reminder
- Local notification, default 11:30 PM, configurable in settings
- Tapping it opens directly to the Log tab
- **Known limitation:** iOS won't let this override silent mode or force interaction. It's a nudge, not an alarm — the day bar's gray gap is what actually creates pressure.

---

## 6. Categories

Fixed seed list, integer IDs (never raw strings — renaming stays painless), editable via the `categories` table (settings UI for this is Phase 2, but the schema already supports it — no future migration needed just to make categories editable):

1. Work / Freelance
2. Study / School
3. Reading
4. Sleep
5. Gaming
6. Scrolling
7. Watching (videos, entertainment, tournaments)
8. Other → free-text note

Rule: a recurring "Other" note over a month gets promoted to a real category. Scrolling and Watching stay separate on purpose — different behaviors, want to see the split.

---

## 7. Good-to-haves (only after v1's non-cuttable core is solid)

Ranked by value, highest first:
1. **JSON export** — dump all tables to a file. Independent of the migration system in Section 4 — protects against a corrupted DB or lost device, not a schema change. Cheap to build (a handful of `SELECT *` calls + `expo-file-system` write). Worth doing even under time pressure.
2. **Category totals per week** — "Gaming: 14h this week."
3. **Before/after 11pm split** — surfaces the late-night pattern directly.

---

## 8. Phase 2 (after Sept 27 — not now, don't build early)

- Settings screen: edit currency, categories, reminder time (schema already supports all three)
- Book tracker: title, pages read, notes in own words
- Freelance income projections
- Weekly review screen
- "Other" → real category promotion, automated from frequency
- *If a Mac/Apple Developer account is ever available:* EAS Build + TestFlight/App Store. Not a current goal — noted so a future session doesn't waste time re-deciding this.

---

## 9. Portfolio packaging (new — this app is a showcase piece)

- **README:** problem statement (the "gray gap" idea, in one paragraph), a short screen recording or GIF of the day bar filling in, tech stack, what shipped vs. what's Phase 2, one honest paragraph on a real tradeoff made under the 6-day crunch.
- **License:** MIT.
- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`), one clean commit per working tab — this falls out naturally from Rule 3 in Section 0 (one tab fully working before the next).
- **`.gitignore`:** standard Expo/RN — `node_modules`, `.expo`, `*.orig.*`, local SQLite artifacts if any land on disk during dev.
- No CI needed for a solo Expo Go project — skip it, don't gold-plate.

---

## 10. Build status

The original six-day plan (§ timeline check above) was completed in a single session on
2026-09-21. All five tabs are built against real SQLite. The deadline is Sept 27, so there
is slack — spend it on the open items in §12, not on new features.

| Day | Goal | Status |
|---|---|---|
| 1 | Scaffold, SQLite schema + migrations, seeded categories, design tokens, shared primitives, **Log** | ✅ |
| 2 | **Overview** — unaccounted hero, 7-day sparkline, stat cards, breakdown sheet | ✅ |
| 3 | **Day** (agenda) — 24h timeline, now-line, tappable gaps routing to Log | ✅ |
| 4 | Nightly local notification + Reminder sheet | ✅ code, ❌ never fired on device |
| 5 | **Money** — net hero, running balance, history sheet, add/edit with in-sheet keypad | ✅ |
| 6 | **Goals** — countdown hero, progress, completed sheet, add sheet. README + MIT licence | ✅ |
| — | Web build works, past-day logging, backup, error boundary, Settings, a11y (2026-09-22) | ✅ |

Repo: https://github.com/paulaustriaweb/betterment (branch `main`, all work pushed).

---

## 11. Where things stand

**Verified on a real iPhone:** a logged time block survives a full force-quit and reopen.
Overview reported 19h30 not logged + 4h30 Reading = 24h exactly, which also confirms the
span-merge maths against real data.

**Verified in the web build (2026-09-22, desktop browser):** the app boots, SQLite opens,
categories seed, an entry saves, and it survives a full page reload. See §13 — this is what
settles the distribution question.

**Never verified on device:** the nightly notification firing, Money and Goals persistence
(different tables from time blocks), and the transaction *update* path. Nor has the web
build been opened on an actual iPhone yet — that is the one remaining check that matters,
because iOS Safari is the shipping platform and it is the browser least like the one it was
tested in.

`tsc`, `expo lint`, 53 Jest tests and `expo export` for both ios and web are all clean.
Tests cover `lib/` only — the date arithmetic, gap detection, money sums, goal countdowns,
currency validation. There are no component tests; the UI was checked by using it.

### Conventions a new session must not undo
- **Spans are merged before summing** in `lib/time.ts`. Overlapping blocks are allowed by
  design, so naive summing double-counts minutes and can report negative unaccounted time.
- **Two React Compiler lint rules bite repeatedly.** `react-hooks/set-state-in-effect`:
  never sync state in an effect — adjust during render against a signature (see Log's route
  params, and AddTransactionSheet loading the row being edited). `react-hooks/immutability`:
  no reassigning a variable inside `.map` during render (why `cumulative()` lives in
  `lib/money.ts`). `react-hooks/refs` is disabled *locally* in `DayTrack` with the reasoning
  inline — PanResponder callbacks never run during render, and recreating the responder
  mid-drag would strand the baseline `gestureState.dx` is measured against.
- **Swipe rows use core `Animated` + `PanResponder`, not gesture-handler.** They render
  inside a `Modal`, where gesture-handler needs its own root view and silently stops
  responding without one.
- **Wording is deliberately plain** (see §3 and the copy commit): "not logged" not
  "unaccounted", "entry" not "block", "left over" not "net", "Day" not "Agenda".

### Deliberate deviations from the mockups
- The Log mockup has a close button; the real Log is a tab, so there is nothing to close.
- Edit/delete live in sheets rather than permanent lists, keeping screens inside the
  five-block density rule while preserving the CRUD the spec requires.

---

## 12. Open items, in the order they should be done

Items 1–5 from the previous handover are **done** (2026-09-22), along with §13's web-build
test that gated them. What changed, so a fresh session doesn't redo it:

- **Logging a past day now works.** `Day` passes the selected `date` (and, for a tapped
  entry, its `edit` id) through to Log, which holds a `day` in state instead of assuming
  today. Log's header names the day and offers a "Today" pill to get back; "End now" hides
  on a past day because it is meaningless there.
- **Backup exists.** Settings → *Back up my data* writes every table to JSON — a file
  download on web, the share sheet on native (`src/lib/backup.ts`). One-way by design;
  there is no restore.
- **Error boundary exists.** `ErrorBoundary` in `src/app/_layout.tsx` renders
  `ErrorScreen` instead of a white screen, with a retry.
- **Settings are reachable**, behind the gear on Overview (it replaced the bell; the
  Reminder sheet is now one row inside it). Currency is editable and validated, categories
  can be renamed and hidden.
- **Accessibility**: roles, labels and selected/checked state on every icon-only and
  chip-style control. `Stepper` now *requires* a `label` — a bare plus sign told a screen
  reader nothing.

**What is actually left, in order:**

**1. Open the web build on a real iPhone.** Everything in §13 was verified in a desktop
Chromium browser. iOS Safari is the shipping platform and the one most likely to differ —
OPFS behaviour, the `require-corp` header, Add to Home Screen, and whether the sync bridge
stays responsive after the app has been backgrounded. Deploy `dist/` somewhere with the two
headers set and use it for a night.

**2. Decide what a restore looks like.** Backup is one-way. On web, "clear website data"
erases everything, and there is no way back in even holding the JSON. An import that reads
a file and replays inserts is maybe sixty lines and is the natural next feature.

**3. Categories can only be renamed or hidden, not added.** Fine for now — the colours are
design tokens, not free choices — but someone cloning this may want a ninth category.

**4. Dynamic Type.** Font sizes are fixed numbers throughout. React Native scales `Text` by
default, but the layouts were designed at one size and were never checked at larger ones.

---

## 13. Distribution — decided: ship the web build

**Expo Go cannot run this app without a dev server.** `expo-updates` does not work in Expo
Go, so there is no publish-and-open path. Every use requires `npx expo start` running on a
machine reachable by the phone. That means the app cannot be used away from the computer,
and cannot be installed by anyone else at all.

Escaping it needs a development or production build, and on iOS that needs a $99 Apple
Developer account — ruled out by §2. The free Apple ID + 7-day sideload route is real but
needs a signed IPA, which needs a Mac or paid EAS credentials.

**Decision (2026-09-22): ship the web build.** `npx expo export --platform web` → a free
static host (Vercel is simplest for static output) → Safari → Add to Home Screen. It gets
an icon, launches fullscreen, needs no laptop, costs nothing, and is the only free route
that makes this a real daily app. Note for the user's benefit: nothing is *downloaded* —
there is no installable file and no App Store, just a URL saved to the home screen.

Tradeoffs knowingly accepted:
- **Notifications and haptics don't work on iOS web.** The nightly reminder effectively
  dies. That is tolerable — §5 already calls it the weaker half of the design, and the
  empty hours on Day are what actually create the pressure. Say so in the README rather
  than pretending it works.
- **Existing phone data does not migrate.** Browser storage is a different store from the
  SQLite file inside Expo Go's sandbox. Whatever is currently logged on the phone starts
  over. This makes §12 item 2 (JSON export) more valuable, not less.

**The open question is answered (2026-09-22): `expo-sqlite` does work in the browser.**
Tested by exporting the web build, serving it, logging an entry and reloading — the entry
survived. `src/db/` keeps its synchronous query API. Three things were required to get
there, and all three are load-bearing:

1. **`metro.config.js` must add `wasm` to `resolver.assetExts`.** Without it the web export
   fails outright — Metro can't resolve `expo-sqlite`'s `wa-sqlite.wasm`.
2. **The database must be opened *asynchronously*.** `openDatabaseSync` can never work on
   web: it blocks the main thread spinning on `Atomics` while waiting for a worker that
   hasn't compiled its wasm yet, and throws `Sync operation timeout` every time. `initDb()`
   now awaits `openDatabaseAsync` and the root layout waits on it before rendering. Every
   query after that stays synchronous, because by then the worker is warm.
3. **The host must send `Cross-Origin-Opener-Policy: same-origin` and
   `Cross-Origin-Embedder-Policy: require-corp`.** OPFS and the sync bridge need
   `SharedArrayBuffer`, which needs cross-origin isolation. Without these headers the app
   is a blank screen. `vercel.json` sets them; any other host needs the equivalent, which
   rules out hosts that can't set headers at all (GitHub Pages). `require-corp`, not
   `credentialless` — Safari only supports the former.

`src/app/+html.tsx` supplies the home-screen metadata (apple-mobile-web-app tags, touch
icon, theme colour) that Expo's default shell leaves out.

**`web.output` is `single`, not `static`** — deliberately. Static rendering pre-renders each
route to HTML at build time, and every screen here answers "what time is it now" against a
database that doesn't exist at build time. The exported HTML therefore showed the build
date and an empty day, and that stale markup stayed in the DOM after hydration. SPA output
has none of that. The cost is that deep links need a rewrite to `/` on the host — see
`vercel.json`.

Expo Go remains the development environment; this only changes what ships.
