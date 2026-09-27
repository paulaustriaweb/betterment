import { dailyColumns, hourlyColumns } from '../chartData';
import { monotonePath, nearestIndex } from '../curve';
import type { TimeBlock } from '../types';

function block(id: number, start: string, end: string, categoryId: number): TimeBlock {
  return { id, startTime: start, endTime: end, categoryId, note: null, createdAt: start };
}
const at = (s: string) => new Date(s);

describe('hourlyColumns', () => {
  const blocks = [
    block(1, '2026-09-24T07:30:00', '2026-09-24T09:00:00', 1),
    block(2, '2026-09-24T08:30:00', '2026-09-24T08:45:00', 3),
  ];

  it('splits a day into 24 hours, each out of 60 minutes', () => {
    const cols = hourlyColumns(blocks, at('2026-09-24T12:00:00'), at('2026-09-25T00:00:00'));
    expect(cols).toHaveLength(24);
    expect(cols[7].total).toBe(30);
    expect(cols[8].segments).toEqual([
      { categoryId: 1, minutes: 60 },
      { categoryId: 3, minutes: 15 },
    ]);
    // Overlapping entries can't make an hour hold more than an hour.
    expect(cols[8].total).toBe(60);
  });

  it('leaves hours that have not happened empty', () => {
    const cols = hourlyColumns(blocks, at('2026-09-24T00:00:00'), at('2026-09-24T08:15:00'));
    expect(cols[8].total).toBe(15);
    expect(cols[9].future).toBe(true);
    expect(cols[9].segments).toEqual([]);
  });
});

describe('dailyColumns', () => {
  it('measures each day out of 24 hours', () => {
    const blocks = [block(1, '2026-09-23T22:00:00', '2026-09-24T06:00:00', 4)];
    const days = [at('2026-09-23T00:00:00'), at('2026-09-24T00:00:00'), at('2026-09-25T00:00:00')];
    const cols = dailyColumns(blocks, days, at('2026-09-24T20:00:00'));
    expect(cols.map((c) => c.total)).toEqual([120, 360, 0]);
    expect(cols.map((c) => c.future)).toEqual([false, false, true]);
    expect(cols[0].capacity).toBe(1440);
  });
});

describe('monotonePath', () => {
  it('draws a single point as a move', () => {
    expect(monotonePath([{ x: 0, y: 5 }])).toBe('M0,5');
  });

  it('never bends past the points on rising data', () => {
    const pts = [
      { x: 0, y: 100 },
      { x: 10, y: 90 },
      { x: 20, y: 10 },
      { x: 30, y: 5 },
    ];
    const ys = monotonePath(pts)
      .split(/[ MC]/)
      .filter(Boolean)
      .map((p) => Number(p.split(',')[1]));
    // Every control point stays inside the data's range: no invented peaks.
    for (const y of ys) {
      expect(y).toBeLessThanOrEqual(100);
      expect(y).toBeGreaterThanOrEqual(5);
    }
  });

  it('stays flat through a flat stretch', () => {
    const d = monotonePath([
      { x: 0, y: 50 },
      { x: 10, y: 50 },
      { x: 20, y: 50 },
    ]);
    const ys = d
      .split(/[ MC]/)
      .filter(Boolean)
      .map((p) => Number(p.split(',')[1]));
    expect(ys.every((y) => y === 50)).toBe(true);
  });
});

describe('nearestIndex', () => {
  it('picks the closest x', () => {
    expect(nearestIndex([0, 10, 20, 30], 14)).toBe(1);
    expect(nearestIndex([0, 10, 20, 30], 26)).toBe(3);
    expect(nearestIndex([0, 10, 20, 30], -5)).toBe(0);
  });
});
