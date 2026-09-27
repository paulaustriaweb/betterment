import { forgetDb, openDb } from './client';
import { runMigrations } from './migrations';
import { seedIfEmpty } from './seed';

let ready: Promise<void> | null = null;

/**
 * On the web the database file is held with an exclusive OPFS lock, so a second
 * tab on the same origin can't open it. WebKit calls that InvalidStateError,
 * Chromium NoModificationAllowedError, and neither message says anything a person
 * can act on.
 *
 * Matched on the text, not `error.name`: expo-sqlite rebuilds worker errors as
 * `new Error(message)` on the way back across postMessage, so the DOMException
 * name is gone by the time it reaches us and only survives inside the string.
 */
export const ALREADY_OPEN = 'AlreadyOpen';

const LOCKED = /InvalidStateError|NoModificationAllowedError|createSyncAccessHandle/;

function explain(error: unknown): Error {
  const text = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  if (LOCKED.test(text)) {
    const locked = new Error('Betterment is already open in another tab or window. Close it, then tap Try again.');
    // Read by ErrorScreen: this is an expected state, not a crash, and shouldn't say so.
    locked.name = ALREADY_OPEN;
    return locked;
  }
  return error instanceof Error ? error : new Error(text);
}

/**
 * A reload or quick relaunch starts the new page while the old one is still letting
 * go of the OPFS lock, so the first open can fail for a moment. Waiting it out (about
 * three seconds in all) turns that race into a short pause; a genuine second tab is
 * still reported once these run out.
 */
const LOCK_RETRY_MS = [200, 400, 800, 1600];

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function open(): Promise<void> {
  for (let attempt = 0; ; attempt++) {
    try {
      const db = await openDb();
      await runMigrations(db);
      await seedIfEmpty(db);
      return;
    } catch (error) {
      const text = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
      if (!LOCKED.test(text) || attempt >= LOCK_RETRY_MS.length) throw error;
      // Drop any half-open handle so the next attempt starts clean.
      forgetDb();
      await wait(LOCK_RETRY_MS[attempt]);
    }
  }
}

/**
 * Idempotent. Nothing may query the database until the returned promise resolves.
 * A failure clears the cached promise, so retrying actually retries instead of
 * handing back the same rejection for the rest of the session.
 */
export function initDb(): Promise<void> {
  if (!ready) {
    ready = open().catch((error: unknown) => {
      ready = null;
      throw explain(error);
    });
  }
  return ready;
}
