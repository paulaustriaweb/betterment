import { getDb } from './client';
import { runMigrations } from './migrations';
import { seedIfEmpty } from './seed';

let initialized = false;

export function initDb(): void {
  if (initialized) return;
  const db = getDb();
  runMigrations(db);
  seedIfEmpty(db);
  initialized = true;
}
