import { getDb } from './client';

/** Every setting at once — a handful of rows, and one read serves every screen. */
export async function listSettings(): Promise<Record<string, string>> {
  const rows = await getDb().getAllAsync<{ key: string; value: string }>('SELECT key, value FROM settings');
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export async function setSetting(key: string, value: string): Promise<void> {
  await getDb().runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, value]
  );
}
