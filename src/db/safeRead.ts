const lastGood = new Map<string, unknown>();

/**
 * How long to stop touching SQLite after a read gives up on the worker.
 * Short enough that the next interaction tries again.
 */
const COOLDOWN_MS = 3000;
let degradedUntil = 0;

/**
 * Reads happen during render, so a throw from one takes out the whole app — a
 * save would succeed and then the re-render it triggered would land on the error
 * screen. Falling back to the last value keeps that from happening.
 *
 * The cooldown is what stops the freeze. Every write bumps one shared counter, so
 * a single save re-queries every hook on every mounted tab — roughly ten blocking
 * round-trips. When the worker stops answering, each of those burns the whole
 * timeout before giving up, and ten timeouts in a row is the multi-second hang
 * that shows up on every screen at once. After the first failure the rest are
 * skipped outright and answered from cache, so the stall is paid once.
 */
export function safeRead<T>(key: string, read: () => T, fallback: T): T {
  const cached = () => (lastGood.get(key) as T | undefined) ?? fallback;

  if (Date.now() < degradedUntil) return cached();

  try {
    const value = read();
    lastGood.set(key, value);
    degradedUntil = 0;
    return value;
  } catch (error) {
    console.error(`[db] read failed: ${key}`, error);
    degradedUntil = Date.now() + COOLDOWN_MS;
    return cached();
  }
}

/** Called after a write so the next read isn't answered from a stale cache. */
export function clearReadCooldown(): void {
  degradedUntil = 0;
}
