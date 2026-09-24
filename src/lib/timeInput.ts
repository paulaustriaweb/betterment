import { addDays, set, startOfDay } from 'date-fns';

export interface Clock {
  hour: number; // 0-23 if the meridiem is known, otherwise 1-12 as typed
  minute: number;
  /** null: typed as 1-12 with no am/pm, so either could be meant. */
  meridiem: 'am' | 'pm' | null;
}

/**
 * What someone typed into a time field on the number pad, or with a colon or
 * am/pm on a full keyboard: "7" → 7:00, "730" → 7:30, "1130" → 11:30,
 * "1930" → 19:30, "7:30p" → 19:30. Null if it isn't a time.
 */
export function parseClock(text: string): Clock | null {
  const cleaned = text.trim().toLowerCase().replace(/\s+/g, '');
  const match = /^(\d{1,2})(?::?(\d{2}))?(a|am|p|pm)?$/.exec(cleaned);
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = match[2] ? Number(match[2]) : 0;
  const suffix = match[3] ? (match[3].startsWith('a') ? 'am' : 'pm') : null;
  if (minute > 59) return null;

  if (suffix) {
    if (hour < 1 || hour > 12) return null;
    return { hour: (hour % 12) + (suffix === 'pm' ? 12 : 0), minute, meridiem: suffix };
  }
  if (hour > 23) return null;
  // 0, 13-23, and a leading zero ("0730") can only mean one thing.
  if (hour === 0 || hour > 12 || match[1].startsWith('0')) {
    return { hour, minute, meridiem: hour < 12 ? 'am' : 'pm' };
  }
  return { hour, minute, meridiem: null };
}

/** Every real moment near `anchor` that the clock could mean. */
function candidates(clock: Clock, anchor: Date): Date[] {
  const hours = clock.meridiem ? [clock.hour] : [clock.hour % 12, (clock.hour % 12) + 12];
  const base = startOfDay(anchor);
  const out: Date[] = [];
  for (const dayOffset of [-1, 0, 1]) {
    for (const hour of hours) {
      out.push(set(addDays(base, dayOffset), { hours: hour, minutes: clock.minute, seconds: 0, milliseconds: 0 }));
    }
  }
  return out;
}

/**
 * The first moment after `from` that the clock could mean — an end time. From
 * 11:00 PM, "7" is 7:00 AM the next morning; from 7:00 AM, "12" is noon.
 */
export function clockAfter(clock: Clock, from: Date): Date {
  const later = candidates(clock, from).filter((c) => c > from);
  return later.reduce((best, c) => (c < best ? c : best));
}

/**
 * The moment closest to `near` that the clock could mean — a start time being
 * corrected. Ties go to the earlier one.
 */
export function clockNear(clock: Clock, near: Date): Date {
  return candidates(clock, near).reduce((best, c) => {
    const d = Math.abs(c.getTime() - near.getTime());
    const b = Math.abs(best.getTime() - near.getTime());
    return d < b || (d === b && c < best) ? c : best;
  });
}
