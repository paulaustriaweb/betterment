import { openDb } from './client';
import { runMigrations } from './migrations';
import { seedIfEmpty } from './seed';

let ready: Promise<void> | null = null;

/** Idempotent. Nothing may query the database until the returned promise resolves. */
export function initDb(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      const db = await openDb();
      runMigrations(db);
      seedIfEmpty(db);
    })();
  }
  return ready;
}
