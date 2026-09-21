import type { Transaction } from './types';

export function sumByType(transactions: Transaction[], type: 'expense' | 'income'): number {
  return transactions.filter((t) => t.type === type).reduce((sum, t) => sum + t.amount, 0);
}

export function netOf(transactions: Transaction[]): number {
  return sumByType(transactions, 'income') - sumByType(transactions, 'expense');
}

export function withinRange(transactions: Transaction[], start: Date, end: Date): Transaction[] {
  const startMs = start.getTime();
  const endMs = end.getTime();
  return transactions.filter((t) => {
    const ms = new Date(t.date).getTime();
    return ms >= startMs && ms < endMs;
  });
}

/** Running totals: [2, 3, -1] -> [2, 5, 4]. Used for the balance sparkline. */
export function cumulative(values: number[]): number[] {
  return values.map((_, i) => values.slice(0, i + 1).reduce((sum, v) => sum + v, 0));
}

/** Label a transaction by its category (expense) or source (income). */
export function transactionLabel(t: Transaction): string {
  return (t.type === 'income' ? t.source : t.category) ?? 'Other';
}
