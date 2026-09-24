import { copyDay } from '../copyDay';
import { evaluateTargets, parseTargets } from '../targets';
import type { TimeBlock } from '../types';

function block(id: number, start: string, end: string, categoryId: number): TimeBlock {
  return { id, startTime: start, endTime: end, categoryId, note: null, createdAt: start };
}
const at = (s: string) => new Date(s);

describe('parseTargets', () => {
  it('keeps well-formed targets and drops the rest', () => {
    const json = JSON.stringify([
      { categoryId: 4, kind: 'atLeast', minutes: 420 },
      { categoryId: 6, kind: 'atMost', minutes: 120 },
      { categoryId: 'x', kind: 'atMost', minutes: 60 },
      { categoryId: 2, kind: 'sometimes', minutes: 60 },
      { categoryId: 3, kind: 'atLeast', minutes: -5 },
    ]);
    expect(parseTargets(json)).toEqual([
      { categoryId: 4, kind: 'atLeast', minutes: 420 },
      { categoryId: 6, kind: 'atMost', minutes: 120 },
    ]);
  });

  it('survives garbage', () => {
    expect(parseTargets('')).toEqual([]);
    expect(parseTargets('{"a":1}')).toEqual([]);
  });
});

describe('evaluateTargets', () => {
  const blocks = [
    block(1, '2026-09-23T23:00:00', '2026-09-24T07:30:00', 4), // 7h30 of sleep lands on the 24th
    block(2, '2026-09-24T20:00:00', '2026-09-24T23:00:00', 6), // 3h scrolling on the 24th
    block(3, '2026-09-25T00:00:00', '2026-09-25T06:00:00', 4), // 6h sleep on the 25th
  ];
  const days = [at('2026-09-24T00:00:00'), at('2026-09-25T00:00:00')];

  it('judges an at-least target per day, counting only that day', () => {
    const [sleep] = evaluateTargets([{ categoryId: 4, kind: 'atLeast', minutes: 420 }], blocks, days);
    expect(sleep.days.map((d) => d.minutes)).toEqual([450, 360]);
    expect(sleep.days.map((d) => d.met)).toEqual([true, false]);
    expect(sleep.metDays).toBe(1);
  });

  it('judges an at-most target — nothing logged is within it', () => {
    const [scroll] = evaluateTargets([{ categoryId: 6, kind: 'atMost', minutes: 120 }], blocks, days);
    expect(scroll.days.map((d) => d.met)).toEqual([false, true]);
  });
});

describe('copyDay', () => {
  const source = [
    block(1, '2026-09-23T07:00:00', '2026-09-23T12:00:00', 1),
    block(2, '2026-09-23T13:00:00', '2026-09-23T17:00:00', 2),
    block(3, '2026-09-23T23:00:00', '2026-09-24T07:00:00', 4),
    block(4, '2026-09-22T23:00:00', '2026-09-23T07:00:00', 4), // started the day before: not copied
  ];

  it('moves the day forward and drops what would still be in the future', () => {
    const drafts = copyDay(source, at('2026-09-23T00:00:00'), at('2026-09-24T00:00:00'), [], at('2026-09-24T21:00:00'));
    expect(drafts.map((d) => [new Date(d.startTime).getHours(), new Date(d.endTime).getHours(), d.categoryId])).toEqual([
      [7, 12, 1],
      [13, 17, 2],
    ]);
    expect(new Date(drafts[0].startTime).getDate()).toBe(24);
  });

  it('skips anything that clashes with an entry already on the target day', () => {
    const existing = [block(9, '2026-09-24T11:00:00', '2026-09-24T12:30:00', 3)];
    const drafts = copyDay(source, at('2026-09-23T00:00:00'), at('2026-09-24T00:00:00'), existing, at('2026-09-24T21:00:00'));
    expect(drafts.map((d) => d.categoryId)).toEqual([2]);
  });
});
