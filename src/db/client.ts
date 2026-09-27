import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

let db: SQLiteDatabase | null = null;

/**
 * Async only, everywhere. On web the sync API busy-spins the main thread on an
 * Atomics lock while a worker runs the query — which timed out after writes had
 * landed, froze every tab at once, and could starve the very worker it waited on.
 */
export async function openDb(): Promise<SQLiteDatabase> {
  if (!db) db = await openDatabaseAsync('betterment.db');
  return db;
}

export function getDb(): SQLiteDatabase {
  if (!db) throw new Error('Database used before initDb() finished.');
  return db;
}

/** Forgets the connection so the next openDb() starts from scratch — after a failed open. */
export function forgetDb(): void {
  db = null;
}
