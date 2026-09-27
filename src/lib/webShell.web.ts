/**
 * The launch screen lives in the HTML itself (+html.tsx) so it shows the instant the
 * page opens. Its sequence takes about two seconds to play; it stays at least that
 * long so opening the app feels like opening it, not a flicker. Tap to skip.
 */
const MIN_VISIBLE_MS = 2100;
/** Reduce Motion: nothing to watch, so no reason to wait long. */
const MIN_VISIBLE_REDUCED_MS = 700;

let ready = false;
let skipped = false;
let finished = false;

function launch(): HTMLElement | null {
  return typeof document === 'undefined' ? null : document.getElementById('launch');
}

function finish(): void {
  const el = launch();
  if (!el || finished) return;
  finished = true;
  el.classList.add('gone');
  setTimeout(() => el.remove(), 450);
}

// Tap to skip: gone at once if the app is ready, otherwise the moment it is.
launch()?.addEventListener('click', () => {
  skipped = true;
  if (ready) finish();
});

/** The line under the logo, following the real loading steps. */
export function setLaunchStatus(text: string): void {
  const el = typeof document === 'undefined' ? null : document.getElementById('launch-status');
  if (!el || el.textContent === text) return;
  el.style.opacity = '0';
  setTimeout(() => {
    el.textContent = text;
    el.style.opacity = '1';
  }, 140);
}

export function hideLaunchScreen(): void {
  if (ready) return;
  ready = true;
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  // performance.now() counts from navigation start, so a slow load waits no longer.
  const wait = skipped ? 0 : Math.max(0, (reduced ? MIN_VISIBLE_REDUCED_MS : MIN_VISIBLE_MS) - performance.now());
  setTimeout(() => setLaunchStatus('Ready'), Math.max(0, wait - 380));
  setTimeout(finish, wait);
}

const RELOAD_KEY = 'betterment-lock-reloads';
const MAX_RELOADS = 3;
const RELOAD_WINDOW_MS = 20_000;

/**
 * A locked database at startup is usually the previous page still letting go of it —
 * a reload or quick relaunch. expo-sqlite's worker can't retry an open once one has
 * failed, so the only real retry is a fresh page. A few quick reloads, behind the
 * launch screen, cover that handover; past that it really is another tab, and the
 * caller shows so. Returns whether a reload is on its way.
 */
export function retryWithFreshPage(): boolean {
  let state = { count: 0, since: Date.now() };
  try {
    const raw = sessionStorage.getItem(RELOAD_KEY);
    if (raw) state = JSON.parse(raw) as typeof state;
  } catch {
    return false;
  }
  if (Date.now() - state.since > RELOAD_WINDOW_MS) state = { count: 0, since: Date.now() };
  if (state.count >= MAX_RELOADS) return false;
  state.count += 1;
  try {
    sessionStorage.setItem(RELOAD_KEY, JSON.stringify(state));
  } catch {
    return false;
  }
  setLaunchStatus('Waiting for the last session to close…');
  setTimeout(() => window.location.reload(), 400 * state.count);
  return true;
}

/** Opened fine — the next lock gets a full set of retries again. */
export function markStarted(): void {
  try {
    sessionStorage.removeItem(RELOAD_KEY);
  } catch {
    // Nothing to clear.
  }
}

/**
 * "Try again" on web: a fresh page, since the worker can't reopen in place — with a
 * full set of quiet retries, in case the other tab is still letting go.
 */
export function restartApp(): boolean {
  markStarted();
  window.location.reload();
  return true;
}

/**
 * Asks the browser not to evict this site's storage under pressure — the database
 * is the only copy of everything logged. Home-screen apps are usually exempt from
 * Safari's 7-day cleanup already; this covers the rest. Best effort: a refusal
 * changes nothing.
 */
export function requestPersistentStorage(): void {
  navigator.storage
    ?.persist?.()
    .catch((error: unknown) => console.warn('persistent storage request failed', error));
}
