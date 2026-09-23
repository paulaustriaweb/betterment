/** Fixed list, in restore order — categories before the entries that point at them. */
export const BACKUP_TABLES = ['categories', 'settings', 'time_blocks', 'transactions', 'goals'] as const;

export type BackupTable = (typeof BACKUP_TABLES)[number];
export type BackupValue = string | number | null;
export type BackupRow = Record<string, BackupValue>;

export interface Backup {
  app: 'betterment';
  schemaVersion: number;
  exportedAt: string;
  tables: Record<BackupTable, BackupRow[]>;
}

export function countRows(backup: Backup): number {
  return Object.values(backup.tables).reduce((sum, rows) => sum + rows.length, 0);
}

function isRow(value: unknown): value is BackupRow {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  return Object.values(value).every((v) => v === null || typeof v === 'string' || typeof v === 'number');
}

/**
 * Throws with a sentence a person can act on. Restoring wipes what's on the
 * device first, so a file that's wrong in any way has to be caught here — before
 * anything is deleted, not halfway through.
 */
export function parseBackup(text: string, currentSchemaVersion: number): Backup {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("That file isn't a Betterment backup — it isn't readable JSON.");
  }

  const candidate = data as Partial<Backup> | null;
  if (!candidate || candidate.app !== 'betterment' || typeof candidate.tables !== 'object' || !candidate.tables) {
    throw new Error("That file isn't a Betterment backup.");
  }
  if (typeof candidate.schemaVersion !== 'number' || candidate.schemaVersion > currentSchemaVersion) {
    throw new Error('That backup is from a newer version of the app. Update first, then restore.');
  }

  const tables = {} as Record<BackupTable, BackupRow[]>;
  for (const name of BACKUP_TABLES) {
    const rows = (candidate.tables as Record<string, unknown>)[name] ?? [];
    if (!Array.isArray(rows) || !rows.every(isRow)) {
      throw new Error(`That backup looks damaged — the ${name.replace('_', ' ')} part can't be read.`);
    }
    tables[name] = rows;
  }
  if (tables.categories.length === 0) {
    throw new Error('That backup has no categories in it, so its entries would have nothing to point at.');
  }

  return {
    app: 'betterment',
    schemaVersion: candidate.schemaVersion,
    exportedAt: typeof candidate.exportedAt === 'string' ? candidate.exportedAt : '',
    tables,
  };
}
