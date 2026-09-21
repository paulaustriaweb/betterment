import { openDb } from './client';
import { runMigrations } from './migrations';
import { seedIfEmpty } from './seed';

let ready: Promise<void> | null = null;

/**
 * On the web the database file is held with an exclusive OPFS lock, so a second
 * tab on the same origin can't open it — it gets a DOMException whose message
 * ("The object is in an invalid state") explains nothing and suggests no way out.
 * WebKit throws InvalidStateError for this, Chromium NoModificationAllowedError.
 */
function explain(error: unknown): Error {
  const name = error instanceof Error ? error.name : '';
  if (name === 'InvalidStateError' || name === 'NoModificationAllowedError') {
    return new Error('Betterment is already open in another tab or window. Close it, then try again.');
  }
  return error instanceof Error ? error : new Error(String(error));
}

/**
 * Idempotent. Nothing may query the database until the returned promise resolves.
 * A failure clears the cached promise, so retrying actually retries instead of
 * handing back the same rejection for the rest of the session.
 */
export function initDb(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      const db = await openDb();
      runMigrations(db);
      seedIfEmpty(db);
    })().catch((error: unknown) => {
      ready = null;
      throw explain(error);
    });
  }
  return ready;
}
