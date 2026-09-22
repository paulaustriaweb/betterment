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

export function listTransactionsForRange(rangeStartIso: string, rangeEndIso: string): Transaction[] {
  const db = getDb();
  const rows = db.getAllSync<TransactionRow>(
    'SELECT * FROM transactions WHERE date >= ? AND date < ? ORDER BY date DESC, id DESC',
    [rangeStartIso, rangeEndIso]
  );
  return rows.map(toTransaction);
}

export function insertTransaction(input: TransactionInput): number {
  const db = getDb();

  // Two identical amounts on the same day are plausible — two coffees — so this
  // can't dedupe on the values alone. A retry within a few seconds of an identical
  // one is a double save, not a second coffee.
  const since = new Date(Date.now() - 8000).toISOString();
  const duplicate = db.getFirstSync<{ id: number }>(
    `SELECT id FROM transactions
     WHERE type = ? AND amount = ?
       AND IFNULL(category, '') = IFNULL(?, '')
       AND IFNULL(source, '') = IFNULL(?, '')
       AND created_at >= ?
     LIMIT 1`,
    [input.type, input.amount, input.category, input.source, since]
  );
  if (duplicate) return duplicate.id;

  const result = db.runSync(
    'INSERT INTO transactions (type, amount, category, source, note, date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [input.type, input.amount, input.category, input.source, input.note, input.date, new Date().toISOString()]
  );
  return result.lastInsertRowId;
}

export function updateTransaction(id: number, input: TransactionInput): void {
  getDb().runSync(
    'UPDATE transactions SET type = ?, amount = ?, category = ?, source = ?, note = ?, date = ? WHERE id = ?',
    [input.type, input.amount, input.category, input.source, input.note, input.date, id]
  );
}

export function deleteTransaction(id: number): void {
  getDb().runSync('DELETE FROM transactions WHERE id = ?', [id]);
}
