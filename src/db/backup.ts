import { getDb } from './client';

/** Fixed list — these names are interpolated into SQL, so they never come from input. */
const TABLES = ['categories', 'time_blocks', 'transactions', 'goals', 'settings'] as const;

export interface Backup {
  app: 'betterment';
  schemaVersion: number;
  exportedAt: string;
  tables: Record<string, unknown[]>;
}

/** Raw rows, column names and all, so a restore is a plain INSERT per row. */
export function buildBackup(): Backup {
  const db = getDb();
  const tables: Record<string, unknown[]> = {};
  for (const name of TABLES) tables[name] = db.getAllSync(`SELECT * FROM ${name}`);
  const row = db.getFirstSync<{ user_version: number }>('PRAGMA user_version');
  return {
    app: 'betterment',
    schemaVersion: row?.user_version ?? 0,
    exportedAt: new Date().toISOString(),
    tables,
  };
}

export function countRows(backup: Backup): number {
  return Object.values(backup.tables).reduce((sum, rows) => sum + rows.length, 0);
}
