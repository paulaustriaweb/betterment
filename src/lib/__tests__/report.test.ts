import { buildReport } from '../report';
import type { TimeBlock } from '../types';

function block(id: number, start: string, end: string, categoryId = 1): TimeBlock {
  return { id, startTime: start, endTime: end, categoryId, note: null, createdAt: start };
}

const at = (s: string) => new Date(s);
const weekStart = at('2026-09-20T00:00:00');
const weekEnd = at('2026-09-27T00:00:00');

describe('buildReport', () => {
  it('reports nothing missing before the first entry ever', () => {
    // Started using the app on Wednesday morning; Sunday to Tuesday don't count.
    const blocks = [block(1, '2026-09-23T07:00:00', '2026-09-23T09:00:00')];
    const r = buildReport(blocks, weekStart, weekEnd, at('2026-09-24T12:00:00'), at('2026-09-23T07:00:00'));
    expect(r.logged).toBe(120);
    // Wednesday 9:00 AM to midnight is the only finished, tracked, unlogged time.
    expect(r.unloggedPast).toBe(15 * 60);
    expect(r.trackedDays).toBe(2);
  });

  it('never counts today as missing — it gets logged tonight', () => {
    const start = at('2026-09-24T00:00:00');
    const r = buildReport([], start, at('2026-09-25T00:00:00'), at('2026-09-24T15:00:00'), at('2026-09-20T00:00:00'));
    expect(r.unloggedPast).toBe(0);
    expect(r.trackedDays).toBe(1);
  });

  it('has nothing to report before any entry exists', () => {
    const r = buildReport([], weekStart, weekEnd, at('2026-09-24T12:00:00'), null);
    expect(r).toEqual({ logged: 0, slices: [], trackedDays: 0, unloggedPast: 0, loggedUntil: null });
  });

  it('sorts categories largest first', () => {
    const blocks = [
      block(1, '2026-09-24T00:00:00', '2026-09-24T07:00:00', 4),
      block(2, '2026-09-24T09:00:00', '2026-09-24T10:00:00', 3),
      block(3, '2026-09-24T10:00:00', '2026-09-24T13:00:00', 1),
    ];
    const r = buildReport(blocks, weekStart, weekEnd, at('2026-09-24T20:00:00'), at('2026-09-24T00:00:00'));
    expect(r.slices).toEqual([
      { categoryId: 4, minutes: 420 },
      { categoryId: 1, minutes: 180 },
      { categoryId: 3, minutes: 60 },
    ]);
    expect(r.loggedUntil).toEqual(at('2026-09-24T13:00:00'));
  });

  it('counts a range that is already over in full', () => {
    const blocks = [block(1, '2026-09-20T08:00:00', '2026-09-20T10:00:00')];
    const r = buildReport(blocks, weekStart, weekEnd, at('2026-10-02T12:00:00'), at('2026-09-20T08:00:00'));
    expect(r.trackedDays).toBe(7);
    expect(r.unloggedPast).toBe(7 * 24 * 60 - 8 * 60 - 120);
  });
});
