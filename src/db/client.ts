import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

let db: SQLiteDatabase | null = null;

/**
 * Opening is async even though every query below is sync, because on web the sync
 * API blocks the main thread waiting on a worker — and that worker has to compile
 * its wasm build first. Opening synchronously there times out before it ever boots.
 */
export async function openDb(): Promise<SQLiteDatabase> {
  if (!db) db = await openDatabaseAsync('betterment.db');
  return db;
}

export function getDb(): SQLiteDatabase {
  if (!db) throw new Error('Database used before initDb() finished.');
  return db;
}
