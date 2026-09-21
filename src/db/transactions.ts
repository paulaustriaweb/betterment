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
  const result = db.runSync(
    'INSERT INTO transactions (type, amount, category, source, note, date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [input.type, input.amount, input.category, input.source, input.note, input.date, new Date().toISOString()]
  );
  return result.lastInsertRowId;
}

export function deleteTransaction(id: number): void {
  getDb().runSync('DELETE FROM transactions WHERE id = ?', [id]);
}
