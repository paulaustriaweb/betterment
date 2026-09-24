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
