import { getDb } from './client';
import type { Transaction } from '@/lib/types';

interface TransactionRow {
  id: number;
  type: string;
  amount: number;
  category: string | null;
  source: string | null;
  note: string | null;
  date: string;
  created_at: string;
}

function toTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    type: row.type === 'income' ? 'income' : 'expense',
    amount: row.amount,
    category: row.category,
    source: row.source,
    note: row.note,
    date: row.date,
    createdAt: row.created_at,
  };
}

export interface TransactionInput {
  type: 'expense' | 'income';
  amount: number;
  category: string | null;
  source: string | null;
  note: string | null;
  date: string;
}

export async function listTransactionsForRange(rangeStartIso: string, rangeEndIso: string): Promise<Transaction[]> {
  const rows = await getDb().getAllAsync<TransactionRow>(
    'SELECT * FROM transactions WHERE date >= ? AND date < ? ORDER BY date DESC, id DESC',
    [rangeStartIso, rangeEndIso]
  );
  return rows.map(toTransaction);
}

// Two identical amounts on the same day are plausible — two coffees — so this
// can't dedupe on the values alone. A retry within a few seconds of an identical
// one is a double save, not a second coffee.
const RECENT_TWIN = `SELECT id FROM transactions
  WHERE type = ? AND amount = ?
    AND IFNULL(category, '') = IFNULL(?, '')
    AND IFNULL(source, '') = IFNULL(?, '')
    AND created_at >= ?`;

export async function insertTransaction(input: TransactionInput): Promise<number> {
  const db = getDb();
  const since = new Date(Date.now() - 8000).toISOString();
  const twin = [input.type, input.amount, input.category, input.source, since];

  // Check and insert in one statement, so two saves can't both pass the check.
  const result = await db.runAsync(
    `INSERT INTO transactions (type, amount, category, source, note, date, created_at)
     SELECT ?, ?, ?, ?, ?, ?, ?
     WHERE NOT EXISTS (${RECENT_TWIN})`,
    [
      input.type,
      input.amount,
      input.category,
      input.source,
      input.note,
      input.date,
      new Date().toISOString(),
      ...twin,
    ]
  );
  if (result.changes > 0) return result.lastInsertRowId;

  const existing = await db.getFirstAsync<{ id: number }>(`${RECENT_TWIN} LIMIT 1`, twin);
  return existing?.id ?? 0;
}

export async function updateTransaction(id: number, input: TransactionInput): Promise<void> {
  await getDb().runAsync(
    'UPDATE transactions SET type = ?, amount = ?, category = ?, source = ?, note = ?, date = ? WHERE id = ?',
    [input.type, input.amount, input.category, input.source, input.note, input.date, id]
  );
}

export async function deleteTransaction(id: number): Promise<void> {
  await getDb().runAsync('DELETE FROM transactions WHERE id = ?', [id]);
}
