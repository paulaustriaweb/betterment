import {
  capAtNow,
  detectOverlap,
  findGaps,
  formatDuration,
  greeting,
  longestGapMinutes,
  minutesByCategory,
  unaccountedHours,
  unaccountedMinutesInRange,
} from '../time';
import type { TimeBlock } from '../types';

function block(id: number, start: string, end: string, categoryId = 1): TimeBlock {
  return { id, startTime: start, endTime: end, categoryId, note: null, createdAt: start };
}

const day = new Date('2026-09-21T12:00:00');

describe('unaccountedHours', () => {
  it('returns 24 for a day with no blocks', () => {
    expect(unaccountedHours([], day)).toBe(24);
  });

  it('subtracts logged time within the day', () => {
    const blocks = [
      block(1, '2026-09-21T00:00:00', '2026-09-21T07:00:00'), // 7h
      block(2, '2026-09-21T09:00:00', '2026-09-21T13:00:00'), // 4h
    ];
    expect(unaccountedHours(blocks, day)).toBe(13);
  });

  it('clamps blocks that spill outside the day', () => {
    // only 00:00-02:00 on the 21st counts
    const blocks = [block(1, '2026-09-20T22:00:00', '2026-09-21T02:00:00')];
    expect(unaccountedHours(blocks, day)).toBe(22);
  });

  it('counts a full day as zero unaccounted', () => {
    const blocks = [block(1, '2026-09-21T00:00:00', '2026-09-22T00:00:00')];
    expect(unaccountedHours(blocks, day)).toBe(0);
  });

  it('does not double-count overlapping blocks', () => {
    // 9-12 and 10-13 overlap; together they cover 4h, not 6h
    const blocks = [
      block(1, '2026-09-21T09:00:00', '2026-09-21T12:00:00'),
      block(2, '2026-09-21T10:00:00', '2026-09-21T13:00:00'),
    ];
    expect(unaccountedHours(blocks, day)).toBe(20);
  });

  it('handles a block fully contained in another', () => {
    const blocks = [
      block(1, '2026-09-21T08:00:00', '2026-09-21T16:00:00'), // 8h
      block(2, '2026-09-21T10:00:00', '2026-09-21T11:00:00'), // inside the first
    ];
    expect(unaccountedHours(blocks, day)).toBe(16);
  });
});

describe('findGaps', () => {
  it('reports the whole day as one gap when nothing is logged', () => {
    expect(findGaps([], day)).toEqual([{ start: 0, end: 1440 }]);
  });

  it('finds gaps between blocks and after the last one', () => {
    const blocks = [
      block(1, '2026-09-21T00:00:00', '2026-09-21T07:00:00'),
      block(2, '2026-09-21T09:00:00', '2026-09-21T13:00:00'),
    ];
    expect(findGaps(blocks, day)).toEqual([
      { start: 420, end: 540 }, // 7:00–9:00
      { start: 780, end: 1440 }, // 13:00–midnight
    ]);
  });

  it('merges overlapping blocks before computing gaps', () => {
    const blocks = [
      block(1, '2026-09-21T00:00:00', '2026-09-21T10:00:00'),
      block(2, '2026-09-21T09:00:00', '2026-09-21T12:00:00'),
    ];
    expect(findGaps(blocks, day)).toEqual([{ start: 720, end: 1440 }]);
  });

  it('returns no gaps for a fully logged day', () => {
    const blocks = [block(1, '2026-09-21T00:00:00', '2026-09-22T00:00:00')];
    expect(findGaps(blocks, day)).toEqual([]);
  });
});

describe('findGaps until now', () => {
  const now = new Date('2026-09-21T08:00:00');

  it('stops at now — the rest of the day has not happened yet', () => {
    expect(findGaps([], day, now)).toEqual([{ start: 0, end: 480 }]);
  });

  it('drops gaps that start after now', () => {
    const blocks = [block(1, '2026-09-21T00:00:00', '2026-09-21T07:00:00')];
    expect(findGaps(blocks, day, now)).toEqual([{ start: 420, end: 480 }]);
  });

  it('reports nothing when an entry runs past now', () => {
    const blocks = [block(1, '2026-09-21T00:00:00', '2026-09-21T09:00:00')];
    expect(findGaps(blocks, day, now)).toEqual([]);
  });

  it('reports nothing for a day that has not started', () => {
    expect(findGaps([], new Date('2026-09-22T12:00:00'), now)).toEqual([]);
  });

  it('ignores an until past midnight', () => {
    expect(findGaps([], day, new Date('2026-09-23T00:00:00'))).toEqual([{ start: 0, end: 1440 }]);
  });
});

describe('capAtNow', () => {
  it('counts only elapsed time as not logged', () => {
    const start = new Date('2026-09-21T00:00:00');
    const end = new Date('2026-09-22T00:00:00');
    const now = new Date('2026-09-21T08:00:00');
    expect(unaccountedMinutesInRange([], start, capAtNow(end, now))).toBe(480);
  });

  it('keeps a range that is already over', () => {
    const end = new Date('2026-09-22T00:00:00');
    expect(capAtNow(end, new Date('2026-09-25T00:00:00'))).toBe(end);
  });
});

describe('longestGapMinutes', () => {
  it('picks the largest unlogged stretch', () => {
    const blocks = [
      block(1, '2026-09-21T00:00:00', '2026-09-21T07:00:00'),
      block(2, '2026-09-21T09:00:00', '2026-09-21T13:00:00'),
      block(3, '2026-09-21T14:00:00', '2026-09-21T18:00:00'),
    ];
    // gaps: 7-9 (120), 13-14 (60), 18-24 (360)
    expect(longestGapMinutes(blocks, day)).toBe(360);
  });
});

describe('minutesByCategory', () => {
  it('sums minutes per category within the range', () => {
    const blocks = [
      block(1, '2026-09-21T00:00:00', '2026-09-21T07:00:00', 4),
      block(2, '2026-09-21T09:00:00', '2026-09-21T13:00:00', 1),
      block(3, '2026-09-21T14:00:00', '2026-09-21T16:00:00', 1),
    ];
    const totals = minutesByCategory(blocks, new Date('2026-09-21T00:00:00'), new Date('2026-09-22T00:00:00'));
    expect(totals.get(4)).toBe(420);
    expect(totals.get(1)).toBe(360);
  });
});

describe('detectOverlap', () => {
  const existing = [block(1, '2026-09-21T09:00:00', '2026-09-21T11:00:00')];

  it('detects a genuine overlap', () => {
    expect(detectOverlap(existing, new Date('2026-09-21T10:00:00'), new Date('2026-09-21T12:00:00'))?.id).toBe(1);
  });

  it('returns null for back-to-back, non-overlapping blocks', () => {
    expect(detectOverlap(existing, new Date('2026-09-21T11:00:00'), new Date('2026-09-21T12:00:00'))).toBeNull();
  });

  it('ignores the block currently being edited', () => {
    expect(detectOverlap(existing, new Date('2026-09-21T09:30:00'), new Date('2026-09-21T10:30:00'), 1)).toBeNull();
  });
});

describe('greeting', () => {
  it('follows the clock instead of always saying evening', () => {
    expect(greeting(new Date('2026-09-21T08:00:00'))).toBe('Good morning');
    expect(greeting(new Date('2026-09-21T14:00:00'))).toBe('Good afternoon');
    expect(greeting(new Date('2026-09-21T21:00:00'))).toBe('Good evening');
  });
});

describe('formatDuration', () => {
  it('formats whole hours', () => {
    expect(formatDuration(120)).toBe('2h');
  });
  it('formats hours and minutes', () => {
    expect(formatDuration(100)).toBe('1h 40m');
  });
  it('formats minutes only', () => {
    expect(formatDuration(45)).toBe('45m');
  });
});
