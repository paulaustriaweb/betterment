import { cumulative, netOf, onDay, sumByType, transactionLabel, withinRange } from '../money';
import type { Transaction } from '../types';

function tx(id: number, type: 'expense' | 'income', amount: number, date: string): Transaction {
  return {
    id,
    type,
    amount,
    category: type === 'expense' ? 'Food' : null,
    source: type === 'income' ? 'Freelance' : null,
    note: null,
    date,
    createdAt: date,
  };
}

const rows = [
  tx(1, 'expense', 850, '2026-09-03T10:00:00'),
  tx(2, 'income', 6000, '2026-09-10T10:00:00'),
  tx(3, 'expense', 150.5, '2026-09-20T10:00:00'),
];

describe('sumByType', () => {
  it('sums expenses', () => {
    expect(sumByType(rows, 'expense')).toBe(1000.5);
  });
  it('sums income', () => {
    expect(sumByType(rows, 'income')).toBe(6000);
  });
  it('returns 0 for an empty list', () => {
    expect(sumByType([], 'expense')).toBe(0);
  });
});

describe('netOf', () => {
  it('is income minus expenses', () => {
    expect(netOf(rows)).toBe(4999.5);
  });
  it('goes negative when spending exceeds income', () => {
    expect(netOf([tx(1, 'expense', 500, '2026-09-01T10:00:00')])).toBe(-500);
  });
});

describe('withinRange', () => {
  it('includes the start and excludes the end', () => {
    const slice = withinRange(rows, new Date('2026-09-03T10:00:00'), new Date('2026-09-20T10:00:00'));
    expect(slice.map((t) => t.id)).toEqual([1, 2]);
  });
});

describe('cumulative', () => {
  it('builds a running total', () => {
    expect(cumulative([2, 3, -1])).toEqual([2, 5, 4]);
  });
  it('handles an empty list', () => {
    expect(cumulative([])).toEqual([]);
  });
});

describe('transactionLabel', () => {
  it('uses category for expenses and source for income', () => {
    expect(transactionLabel(rows[0])).toBe('Food');
    expect(transactionLabel(rows[1])).toBe('Freelance');
  });
});

describe('onDay', () => {
  it("moves to the picked date and keeps the clock time", () => {
    const result = onDay(new Date('2026-09-20T00:00:00'), new Date('2026-09-23T21:15:30'));
    expect(result).toEqual(new Date('2026-09-20T21:15:30'));
  });

  it('crosses a month boundary', () => {
    const result = onDay(new Date('2026-08-31T00:00:00'), new Date('2026-09-01T08:00:00'));
    expect(result).toEqual(new Date('2026-08-31T08:00:00'));
  });
});
