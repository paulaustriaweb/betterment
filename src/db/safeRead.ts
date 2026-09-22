const lastGood = new Map<string, unknown>();

/**
 * Reads happen during render, so a throw from one takes out the whole app —
 * a save would succeed and then the re-render it triggered would land on the
 * error screen. The sync bridge can time out on a slow device, and that is not
 * worth losing the session over: fall back to the last value that came back,
 * and the next write re-reads.
 */
export function safeRead<T>(key: string, read: () => T, fallback: T): T {
  try {
    const value = read();
    lastGood.set(key, value);
    return value;
  } catch (error) {
    console.error(`[db] read failed: ${key}`, error);
    return (lastGood.get(key) as T | undefined) ?? fallback;
  }
}
