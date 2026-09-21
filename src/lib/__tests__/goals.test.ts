import { countdownLabel, daysUntil, goalProgress, sortByDeadline, urgencyOf } from '../goals';
import type { Goal } from '../types';

function goal(id: number, deadline: string, createdAt = '2026-09-01T00:00:00'): Goal {
  return { id, title: `Goal ${id}`, deadline, isComplete: false, createdAt };
}

const now = new Date('2026-09-21T12:00:00');

describe('daysUntil', () => {
  it('counts whole calendar days ahead', () => {
    expect(daysUntil('2026-09-27T00:00:00', now)).toBe(6);
  });
  it('is 0 on the deadline day regardless of time', () => {
    expect(daysUntil('2026-09-21T23:00:00', now)).toBe(0);
  });
  it('goes negative once overdue', () => {
    expect(daysUntil('2026-09-18T00:00:00', now)).toBe(-3);
  });
});

describe('urgencyOf', () => {
  it('flags overdue', () => expect(urgencyOf(-1)).toBe('overdue'));
  it('flags the next week as soon', () => expect(urgencyOf(7)).toBe('soon'));
  it('flags anything further out as later', () => expect(urgencyOf(8)).toBe('later'));
});

describe('goalProgress', () => {
  it('is 0 at creation', () => {
    expect(goalProgress('2026-09-21T12:00:00', '2026-10-21T12:00:00', now)).toBe(0);
  });
  it('is halfway at the midpoint', () => {
    expect(goalProgress('2026-09-11T12:00:00', '2026-10-01T12:00:00', now)).toBeCloseTo(0.5, 5);
  });
  it('clamps to 1 once overdue', () => {
    expect(goalProgress('2026-09-01T00:00:00', '2026-09-10T00:00:00', now)).toBe(1);
  });
  it('handles a deadline at or before creation', () => {
    expect(goalProgress('2026-09-21T00:00:00', '2026-09-20T00:00:00', now)).toBe(1);
  });
});

describe('sortByDeadline', () => {
  it('puts the nearest deadline first without mutating the input', () => {
    const input = [goal(1, '2026-10-05T00:00:00'), goal(2, '2026-09-25T00:00:00')];
    expect(sortByDeadline(input).map((g) => g.id)).toEqual([2, 1]);
    expect(input.map((g) => g.id)).toEqual([1, 2]);
  });
});

describe('countdownLabel', () => {
  it('names today and tomorrow', () => {
    expect(countdownLabel(0)).toBe('Today');
    expect(countdownLabel(1)).toBe('Tomorrow');
  });
  it('counts days ahead', () => expect(countdownLabel(12)).toBe('12d'));
  it('counts days over', () => expect(countdownLabel(-3)).toBe('3d over'));
});
