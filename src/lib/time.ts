import { addDays, differenceInMinutes, format, startOfDay } from 'date-fns';

import type { TimeBlock } from './types';

const MINUTES_PER_DAY = 24 * 60;

export interface Span {
  /** Minutes from the start of the range. */
  start: number;
  end: number;
}

function clampToRange(blocks: TimeBlock[], rangeStart: Date, rangeEnd: Date): Span[] {
  const total = differenceInMinutes(rangeEnd, rangeStart);
  return blocks
    .map((b) => ({
      start: Math.max(0, differenceInMinutes(new Date(b.startTime), rangeStart)),
      end: Math.min(total, differenceInMinutes(new Date(b.endTime), rangeStart)),
    }))
    .filter((s) => s.end > s.start)
    .sort((a, b) => a.start - b.start);
}

/**
 * Overlapping blocks are allowed by design (the Log tab warns but doesn't block),
 * so spans must be merged before summing or the same minute counts twice.
 */
function merge(spans: Span[]): Span[] {
  const out: Span[] = [];
  for (const span of spans) {
    const last = out[out.length - 1];
    if (last && span.start <= last.end) last.end = Math.max(last.end, span.end);
    else out.push({ ...span });
  }
  return out;
}

export function loggedMinutesInRange(blocks: TimeBlock[], rangeStart: Date, rangeEnd: Date): number {
  return merge(clampToRange(blocks, rangeStart, rangeEnd)).reduce((sum, s) => sum + (s.end - s.start), 0);
}

export function unaccountedMinutesInRange(blocks: TimeBlock[], rangeStart: Date, rangeEnd: Date): number {
  const total = differenceInMinutes(rangeEnd, rangeStart);
  return Math.max(0, total - loggedMinutesInRange(blocks, rangeStart, rangeEnd));
}

export function loggedMinutes(blocks: TimeBlock[], day: Date): number {
  const dayStart = startOfDay(day);
  return loggedMinutesInRange(blocks, dayStart, addDays(dayStart, 1));
}

export function unaccountedMinutes(blocks: TimeBlock[], day: Date): number {
  return Math.max(0, MINUTES_PER_DAY - loggedMinutes(blocks, day));
}

export function unaccountedHours(blocks: TimeBlock[], day: Date): number {
  return unaccountedMinutes(blocks, day) / 60;
}

/** The unlogged stretches of a day, in minutes from midnight. The product's whole point. */
export function findGaps(blocks: TimeBlock[], day: Date): Span[] {
  const dayStart = startOfDay(day);
  const spans = merge(clampToRange(blocks, dayStart, addDays(dayStart, 1)));
  const gaps: Span[] = [];
  let cursor = 0;
  for (const span of spans) {
    if (span.start > cursor) gaps.push({ start: cursor, end: span.start });
    cursor = Math.max(cursor, span.end);
  }
  if (cursor < MINUTES_PER_DAY) gaps.push({ start: cursor, end: MINUTES_PER_DAY });
  return gaps;
}

export function longestGapMinutes(blocks: TimeBlock[], day: Date): number {
  return findGaps(blocks, day).reduce((max, g) => Math.max(max, g.end - g.start), 0);
}

/** Logged minutes per category id across a range. Overlaps are counted per category as-is. */
export function minutesByCategory(blocks: TimeBlock[], rangeStart: Date, rangeEnd: Date): Map<number, number> {
  const totals = new Map<number, number>();
  const total = differenceInMinutes(rangeEnd, rangeStart);
  for (const b of blocks) {
    const start = Math.max(0, differenceInMinutes(new Date(b.startTime), rangeStart));
    const end = Math.min(total, differenceInMinutes(new Date(b.endTime), rangeStart));
    if (end <= start) continue;
    totals.set(b.categoryId, (totals.get(b.categoryId) ?? 0) + (end - start));
  }
  return totals;
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Compact form for stat cards: "7h 00m" keeps the column width stable. */
export function formatHoursPadded(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h ${m < 10 ? `0${m}` : m}m`;
}

/** First existing block whose range overlaps [candidateStart, candidateEnd), or null. */
export function detectOverlap(
  existing: TimeBlock[],
  candidateStart: Date,
  candidateEnd: Date,
  excludeId?: number
): TimeBlock | null {
  for (const block of existing) {
    if (block.id === excludeId) continue;
    const bStart = new Date(block.startTime);
    const bEnd = new Date(block.endTime);
    if (candidateStart < bEnd && candidateEnd > bStart) return block;
  }
  return null;
}

export function defaultStartTime(lastBlockEndTime: string | null): Date {
  return lastBlockEndTime ? new Date(lastBlockEndTime) : new Date();
}

export function formatTime(iso: string): string {
  return format(new Date(iso), 'h:mm a');
}
