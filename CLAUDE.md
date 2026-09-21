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

- **iOS only**, via **Expo Go**. No Mac, no Apple Developer account, no standalone build, no App Store.
- **Free.** No paid services, no hosting, no subscriptions, no cloud DB.
- **Offline-first.** Works with zero network access. No accounts, no login, no sync.
- **Deadline: September 27, 2026.**

### ⚠️ Timeline reality check
The original plan assumed 18 build days from Sept 9. As of today (**Sept 21**), 12 of those days are gone and the project folder was still empty when this file was written — **6 days remain**, not 18. Section 10 below replaces the old 18-day build order with a 6-day one built around the project's own stated cutting rule: *if a day slips, cut a feature, don't extend the deadline. Money and Goals are cuttable. Log tab and the day bar are not.* If Sept 27 has since moved, or isn't a real hard deadline, say so and this section gets revised — everything downstream of it assumes 6 days.

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

## 10. Build order — 6 days remaining (Sept 21 → Sept 27)

Replaces the original 18-day plan, which assumed a Sept 9 start that didn't happen. Ordered by the project's own cutting rule: **Log tab + day bar are the app; Money and Goals are stretch.**

| Day | Goal | Status |
|---|---|---|
| 1 (Sept 21–22) | Expo + expo-router scaffold, folder structure, SQLite schema + migration runner, seeded categories, design tokens, shared UI primitives, **Log tab** wired to SQLite (add / edit / delete) | ✅ done |
| 2 (Sept 23) | **Overview tab**: hero unaccounted card + 7-day sparkline, Logged / Longest-gap stat cards, "Where it went" breakdown sheet, range pills (today/week/month) | ✅ done |
| 3 (Sept 24) | **Agenda tab**: 24h scrollable timeline auto-scrolled to now, week date strip, now-line, category blocks, dashed tappable gap blocks that route to Log pre-filled | ✅ done |
| 4 (Sept 25) | Nightly local notification (default 11:30 PM) → deep-links to Log, configured from a Reminder sheet behind the Overview bell | ✅ code done, **needs on-device test** |
| 5 (Sept 26) | **Money tab**: net hero + running-balance sparkline, Spent/Earned cards, transactions sheet, add sheet with in-sheet keypad | ✅ done |
| 6 (Sept 27) | **Goals tab**: countdown hero with elapsed-progress bar, upcoming cards, completed sheet, add sheet with live deadline dates. README + MIT license. | ✅ done |

If Day 2 or 3 slips, Money and Goals both drop from v1 without discussion — that was already decided, not a new decision to make under pressure.

**Verify persistence before calling any day done.** Add a block, fully reload the app, confirm it's still there.

---

## 11. Where things stand

Scaffolded and working: Expo SDK 57 + expo-router (5 tabs), TypeScript strict, SQLite with a `PRAGMA user_version` migration runner and seeded categories, Instrument Sans loaded via `@expo-google-fonts`, design tokens in `src/lib/colors.ts`, shared primitives in `src/components/ui.tsx` (Card, ScreenHeader, RangePills, StatCard, DisclosureRow, Stepper, PrimaryButton, Sheet), plus `Sparkline`. **Log and Overview are both fully wired to SQLite.** `tsc`, `expo lint` and `jest` (18 tests) are clean, and `expo export --platform ios` bundles successfully.

`src/lib/time.ts` is the analytical core and carries the test suite: `loggedMinutesInRange`, `unaccountedMinutesInRange`, `findGaps`, `longestGapMinutes`, `minutesByCategory`, `detectOverlap`. **Spans are merged before summing** — overlapping blocks are allowed by design, so naive summing double-counted minutes and could report negative unaccounted time. Don't reintroduce that.

Deliberate deviations from the mockups, both correct for a real app:
- The Log mockup has a close button; the real Log is a **tab**, so there's nothing to close.
- Edit/delete live in a **"Today's blocks" sheet** rather than a permanent list, which keeps Log inside the five-block density rule while preserving the CRUD the spec requires.

**All five tabs are built and wired to SQLite.** 41 tests across `time`, `money` and `goals`.

Remaining before it's shippable as a portfolio piece:
1. **Put your name in `LICENSE`** — it still says `[YOUR NAME]`.
2. Screenshots or a screen recording for the README.
3. On-device check of Money and Goals persistence (time blocks are confirmed; the other two tables are not).
4. Nightly reminder still unproven on hardware — see the Expo Go risk below.

Money uses an **in-sheet keypad** (`AmountPad`) rather than a `TextInput` — the OS keyboard covers half a bottom sheet. Amounts are held as a string while typing and parsed on save. Currency comes from `settings.currency` through `formatCurrency`, never a hardcoded symbol.

Two React Compiler lint rules have bitten already and will again: `react-hooks/set-state-in-effect` (no state syncing in effects — adjust during render) and `react-hooks/immutability` (no reassigning a variable inside a `.map` during render — the cumulative-sum helper in `lib/money.ts` exists because of this).

Agenda → Log passes `start` and `dur` params for a tapped gap. Log is a tab and never remounts, so it adjusts state **during render** against a param signature rather than syncing in an effect (`react-hooks/set-state-in-effect` will fail the build otherwise).

**Persistence verified on device 2026-09-21.** A Reading block survived a full force-quit and reopen; Overview reported 19h30 unaccounted + 4h30 Reading = 24h exactly, which also validates the span-merge maths against real data.

**Open risk: notifications in Expo Go.** Local scheduled notifications are implemented but unproven on hardware. Expo Go has been narrowing `expo-notifications` support, and this project can't use a dev client. If the nightly reminder won't fire from Expo Go, **don't fight it** — the reminder is explicitly the weaker half of the design (§5); the gaps on Agenda are the real pressure. Cut it, note it in the README, move on.
