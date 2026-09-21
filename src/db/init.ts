import { openDb } from './client';
import { runMigrations } from './migrations';
import { seedIfEmpty } from './seed';

let ready: Promise<void> | null = null;

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
      throw error;
    });
  }
  return ready;
}
