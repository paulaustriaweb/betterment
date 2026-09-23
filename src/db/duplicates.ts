import { getDb } from './client';

// Double taps during the old dead-button period saved some things twice. Inserts
// are idempotent now; these clean up what got in before that. A duplicate is an
// exact twin — same category over the same minutes, or the same open goal due the
// same day — and the oldest copy (lowest id) is always the one kept.

const EXTRA_BLOCKS = `SELECT id FROM time_blocks WHERE id NOT IN (
  SELECT MIN(id) FROM time_blocks GROUP BY start_time, end_time, category_id
)`;

const EXTRA_GOALS = `SELECT id FROM goals WHERE id NOT IN (
  SELECT MIN(id) FROM goals GROUP BY title, deadline, is_complete
)`;

export async function countDuplicates(): Promise<number> {
  const db = getDb();
  const blocks = await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM (${EXTRA_BLOCKS})`);
  const goals = await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM (${EXTRA_GOALS})`);
  return (blocks?.n ?? 0) + (goals?.n ?? 0);
}

/** Returns how many rows went. */
export async function removeDuplicates(): Promise<number> {
  const db = getDb();
  let removed = 0;
  await db.withTransactionAsync(async () => {
    removed += (await db.runAsync(`DELETE FROM time_blocks WHERE id IN (${EXTRA_BLOCKS})`)).changes;
    removed += (await db.runAsync(`DELETE FROM goals WHERE id IN (${EXTRA_GOALS})`)).changes;
  });
  return removed;
}
