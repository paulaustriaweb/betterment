import { BACKUP_TABLES, type Backup, type BackupRow } from '@/lib/backupFormat';
import { getDb } from './client';

/** Raw rows, column names and all, so a restore is a plain INSERT per row. */
export async function buildBackup(): Promise<Backup> {
  const db = getDb();
  const tables = {} as Backup['tables'];
  // Table names come from the fixed list above, never from input.
  for (const name of BACKUP_TABLES) tables[name] = await db.getAllAsync<BackupRow>(`SELECT * FROM ${name}`);
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  return {
    app: 'betterment',
    schemaVersion: row?.user_version ?? 0,
    exportedAt: new Date().toISOString(),
    tables,
  };
}

/**
 * Replaces everything on the device with the backup. One transaction: if any row
 * fails, the rollback leaves the data exactly as it was before the tap.
 *
 * Column names in a backup file are untrusted, and they go into SQL. Only names the
 * live table actually has are used — anything else in the file is dropped.
 */
export async function restoreBackup(backup: Backup): Promise<void> {
  const db = getDb();

  const columns = new Map<string, Set<string>>();
  for (const name of BACKUP_TABLES) {
    const info = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${name})`);
    columns.set(name, new Set(info.map((c) => c.name)));
  }

  await db.withTransactionAsync(async () => {
    // Children first, so nothing is ever left pointing at a deleted category.
    for (const name of [...BACKUP_TABLES].reverse()) await db.runAsync(`DELETE FROM ${name}`);

    for (const name of BACKUP_TABLES) {
      const known = columns.get(name) ?? new Set<string>();
      for (const row of backup.tables[name]) {
        const keys = Object.keys(row).filter((k) => known.has(k));
        if (keys.length === 0) continue;
        await db.runAsync(
          `INSERT INTO ${name} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`,
          keys.map((k) => row[k])
        );
      }
    }
  });
}
