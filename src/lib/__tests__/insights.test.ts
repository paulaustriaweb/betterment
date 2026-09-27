import { awakeLate, biggestChange, compareSlices } from '../insights';
import type { TimeBlock } from '../types';

function block(id: number, start: string, end: string, categoryId: number): TimeBlock {
  return { id, startTime: start, endTime: end, categoryId, note: null, createdAt: start };
}
const at = (s: string) => new Date(s);

describe('compareSlices', () => {
  it('pairs each activity with last time, including ones that stopped', () => {
    const changes = compareSlices(
      [
        { categoryId: 5, minutes: 300 },
        { categoryId: 1, minutes: 120 },
      ],
      [
        { categoryId: 5, minutes: 120 },
        { categoryId: 6, minutes: 90 },
      ]
    );
    expect(changes).toEqual([
      { categoryId: 5, now: 300, before: 120, delta: 180 },
      { categoryId: 1, now: 120, before: 0, delta: 120 },
      { categoryId: 6, now: 0, before: 90, delta: -90 },
    ]);
  });
});

describe('biggestChange', () => {
  it('picks the largest swing either way', () => {
    const c = biggestChange([
      { categoryId: 1, now: 60, before: 0, delta: 60 },
      { categoryId: 2, now: 0, before: 150, delta: -150 },
    ]);
    expect(c?.categoryId).toBe(2);
  });

  it('ignores anything under half an hour', () => {
    expect(biggestChange([{ categoryId: 1, now: 40, before: 20, delta: 20 }])).toBeNull();
  });
});

describe('awakeLate', () => {
  const sleep = new Set([4]);
  const days = [at('2026-09-24T00:00:00')];
  const now = at('2026-09-25T12:00:00');

  it('counts awake time between 11 PM and when the night ends, not sleep', () => {
    const blocks = [
      block(1, '2026-09-24T22:00:00', '2026-09-25T01:00:00', 5), // 2h of it after 11 PM
      block(2, '2026-09-25T01:00:00', '2026-09-25T02:00:00', 6), // 1h
      block(3, '2026-09-25T02:00:00', '2026-09-25T09:00:00', 4), // sleep: never counts
    ];
    const r = awakeLate(blocks, days, now, sleep);
    expect(r.minutes).toBe(180);
    expect(r.slices).toEqual([
      { categoryId: 5, minutes: 120 },
      { categoryId: 6, minutes: 60 },
    ]);
  });

  it('stops where the night ends', () => {
    const blocks = [block(1, '2026-09-25T04:00:00', '2026-09-25T07:00:00', 5)];
    expect(awakeLate(blocks, days, now, sleep).minutes).toBe(60);
    expect(awakeLate(blocks, days, now, sleep, 6).minutes).toBe(120);
  });

  it("doesn't count a night that hasn't happened yet", () => {
    const blocks = [block(1, '2026-09-24T23:00:00', '2026-09-25T01:00:00', 5)];
    expect(awakeLate(blocks, days, at('2026-09-24T23:30:00'), sleep).minutes).toBe(30);
  });
});
