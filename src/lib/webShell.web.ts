/**
 * The launch screen lives in the HTML itself (+html.tsx) so it shows the instant the
 * page opens, while the 1.7 MB bundle downloads and parses. Faded out once the app
 * has its database and fonts.
 */
export function hideLaunchScreen(): void {
  const el = document.getElementById('launch');
  if (!el) return;
  el.classList.add('gone');
  setTimeout(() => el.remove(), 400);
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
