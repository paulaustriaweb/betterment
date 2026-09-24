import { findRoutines, shortClock } from '../routines';
import type { TimeBlock } from '../types';

function block(id: number, start: string, end: string, categoryId: number): TimeBlock {
  return { id, startTime: start, endTime: end, categoryId, note: null, createdAt: start };
}

describe('findRoutines', () => {
  it('surfaces what was logged the same way more than once, most repeated first', () => {
    const blocks = [
      block(1, '2026-09-20T23:00:00', '2026-09-21T07:00:00', 4),
      block(2, '2026-09-21T23:00:00', '2026-09-22T07:00:00', 4),
      block(3, '2026-09-22T23:00:00', '2026-09-23T07:00:00', 4),
      block(4, '2026-09-21T09:00:00', '2026-09-21T17:00:00', 1),
      block(5, '2026-09-22T09:00:00', '2026-09-22T17:00:00', 1),
      block(6, '2026-09-22T19:00:00', '2026-09-22T20:00:00', 5),
    ];
    const routines = findRoutines(blocks);
    expect(routines.map((r) => [r.categoryId, r.count])).toEqual([
      [4, 3],
      [1, 2],
    ]);
    expect(routines[0].start).toEqual({ hour: 23, minute: 0, meridiem: 'pm' });
    expect(routines[0].end).toEqual({ hour: 7, minute: 0, meridiem: 'am' });
  });

  it('ignores one-offs', () => {
    expect(findRoutines([block(1, '2026-09-22T19:00:00', '2026-09-22T20:00:00', 5)])).toEqual([]);
  });
});

describe('shortClock', () => {
  it.each([
    [{ hour: 23, minute: 0, meridiem: 'pm' as const }, '11p'],
    [{ hour: 7, minute: 0, meridiem: 'am' as const }, '7a'],
    [{ hour: 9, minute: 30, meridiem: 'am' as const }, '9:30a'],
    [{ hour: 12, minute: 0, meridiem: 'pm' as const }, '12p'],
    [{ hour: 0, minute: 15, meridiem: 'am' as const }, '12:15a'],
  ])('formats %o as %s', (clock, expected) => {
    expect(shortClock(clock)).toBe(expected);
  });
});
