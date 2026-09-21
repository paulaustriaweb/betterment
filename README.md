# Betterment

An offline-first iOS time and money tracker built around one idea: **the gap is the point.**

Most trackers reward you for showing up — streaks, checkmarks, a cheerful "well done!". Those are easy to rationalize away, and they say nothing about the hours you actually lost. Betterment inverts it. Your day is a 24-hour timeline, and everything you haven't logged sits there as an empty, dashed-outline block labelled *"2h 30m not logged."*

No streaks. No badges. Just an honest answer to "where did today go?"

---

## What it does

**Overview** — one number, as large as it deserves to be: how much of the period you never logged. A 7-day sparkline shows whether it's trending in the right direction. "Where it went" opens a breakdown where *Not logged* competes directly against the things you actually did.

**Your day** — a 24-hour timeline that opens at the current hour, with a live now-line. Logged entries appear in their category colours. Gaps render as dashed, tappable blocks — **tap one and the Log screen opens pre-filled with exactly that stretch, on that date.** That single interaction is the whole product. Browse back through the week strip and logging a day you forgot works the same way.

**Log** — duration is the primary control, not two fiddly time pickers. Steppers move it in 15-minute increments, "End now" snaps to the current time, and a live preview bar shows where the block lands in the day. Overlapping blocks are allowed but warned about — the warning disappears on its own once you nudge the start clear.

**Money** — net for the period with a running-balance sparkline, plus spent and earned. Adding a transaction uses an in-sheet keypad rather than the OS keyboard, which would otherwise cover half the sheet.

**Goals** — the nearest deadline gets the hero treatment with a countdown and an elapsed-time progress bar. Completing one is a single tap with haptic feedback; finished goals move into a sheet rather than cluttering the list.

**Settings** — currency, category names, and a one-tap JSON backup of every table. Nothing personal is hardcoded; clone it, set your currency, rename the categories you don't want, and it's yours.

**Nightly reminder** — one local notification, configurable, that deep-links straight to Log. Native only; see the tradeoffs below.

---

## Running it

Requires Node. Development runs in Expo Go on a phone:

```bash
npm install
npx expo start
```

Scan the QR code with the iPhone Camera app, which hands off to Expo Go. Phone and computer need to be on the same Wi-Fi (`npx expo start --tunnel` if not).

```bash
npm test        # Jest — the date and money logic
npx expo lint   # ESLint
npx tsc --noEmit
```

## Installing it on a phone

Expo Go needs a dev server on the same network, so it can't be the thing you actually use each night — and with no Apple Developer account there's no App Store build either. So the real app is the **web build, added to the home screen**:

```bash
npx expo export --platform web   # → dist/
```

Deploy `dist/` to any static host and open it in Safari → Share → *Add to Home Screen*. It gets an icon, launches without browser chrome, and works offline.

**The host must send two headers**, or you get a blank screen:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

`expo-sqlite` compiles to WebAssembly and stores the database in OPFS, which needs `SharedArrayBuffer`, which needs cross-origin isolation. (`require-corp` rather than `credentialless` — Safari only supports the former.) The build is also a single-page app, so unknown paths have to be rewritten to `/`.

`netlify.toml` and `vercel.json` both set all of this up, so either host works with no configuration. On anything else, configure the equivalent — and note that a host which can't set response headers at all, such as GitHub Pages, can't run this.

---

## Stack

React Native via **Expo (SDK 57)** · **expo-router** file-based tabs · **expo-sqlite** for local storage · TypeScript in strict mode · date-fns · react-native-svg · Instrument Sans via `@expo-google-fonts`.

No backend, no cloud database, no accounts, no analytics. The app talks to SQLite on the device and nothing leaves the phone.

### A few decisions worth explaining

**No state management library.** Domain hooks read SQLite through `useMemo`, keyed on a shared `dbVersion` counter that bumps after every write. `expo-sqlite`'s synchronous API means reads resolve during render, so there's no loading state to manage and no stale-data gap. Roughly thirty lines where Redux or React Query would have been hundreds.

**Opened async, queried sync.** The one asynchronous call in the data layer is opening the database, which the app awaits before rendering. On web those sync queries are served by a worker holding the wasm build, and that worker has to finish booting before it can answer anything — `openDatabaseSync` there blocks the main thread waiting for a worker that hasn't started yet, and times out every time. Awaiting the open once buys every query after it the synchronous API.

**Migrations from day one.** `PRAGMA user_version` plus an append-only list of migration functions. The app is meant to hold years of nightly data; the schema will change, and "delete the app and start over" isn't an acceptable upgrade path.

**Spans are merged before summing.** Overlapping blocks are permitted by design, which means naively adding durations double-counts minutes — and could report *negative* unaccounted time. `lib/time.ts` merges intervals first. This is the bug the test suite exists to prevent.

**No chart library.** The bars, timeline and sparklines are flex-proportioned `View`s and inline SVG polylines. A charting dependency would have outweighed everything it drew.

---

## An honest tradeoff

This was built in six days against a fixed deadline, and the schedule shaped it.

The biggest compromise: **there are no component tests.** The test suite covers `lib/` — the date arithmetic, gap detection, money sums — because that's where a silent off-by-one destroys the app's entire premise. The UI was verified by using it on a real device instead. At this scope that's the right trade, but it's a trade, not a principle.

The second: the **nightly reminder is the weakest part of the design and always was.** iOS won't let a local notification override silent mode or demand a response. It's a nudge. The actual pressure comes from opening Your day and seeing three hours of dashed emptiness where your evening went — which is why that interaction got the engineering attention and the notification got a checkbox.

Shipping as a web app makes that worse rather than better: **iOS gives a home-screen web app no scheduled notifications at all**, so the reminder is dead on the platform the app actually runs on. The sheet says so plainly instead of pretending to work. (Haptics survive — `expo-haptics` fakes them on iOS Safari with a hidden switch toggle.) That's the price of the only free route to an installable app, and the gaps on Your day were always the part carrying the weight.

## Not built (deliberately)

Restoring *from* a backup (export is one-way — the file is a record, not a sync mechanism), adding or deleting categories beyond renaming and hiding the seeded eight, a book tracker, and weekly review. Scoped out to protect the parts that make the app worth opening every night.

## License

MIT
