import type { SQLiteDatabase } from 'expo-sqlite';

type Migration = (db: SQLiteDatabase) => Promise<void>;

// Append-only. Never edit a migration's SQL once it has shipped — a year of
// nightly logs depends on every past migration still running verbatim. (The
// first one moved from execSync to execAsync with the async migration; its SQL
// is untouched.)
const migrations: Migration[] = [
  async (db) => {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT NOT NULL,
        is_active INTEGER DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS time_blocks (
        id INTEGER PRIMARY KEY,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        category_id INTEGER NOT NULL,
        note TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (category_id) REFERENCES categories(id)
      );
      CREATE INDEX IF NOT EXISTS idx_time_blocks_start ON time_blocks(start_time);

      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        category TEXT,
        source TEXT,
        note TEXT,
        date TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);

      CREATE TABLE IF NOT EXISTS goals (
        id INTEGER PRIMARY KEY,
        title TEXT NOT NULL,
        deadline TEXT NOT NULL,
        is_complete INTEGER DEFAULT 0,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
  },
];

/** What a fully migrated database reports as `PRAGMA user_version`. */
export const SCHEMA_VERSION = migrations.length;

export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const from = row?.user_version ?? 0;
  for (let i = from; i < migrations.length; i++) {
    // One transaction per step: a migration that dies halfway leaves the old
    // schema and the old version number, never half of each.
    await db.withTransactionAsync(async () => {
      await migrations[i](db);
      await db.execAsync(`PRAGMA user_version = ${i + 1}`);
    });
  }
}
