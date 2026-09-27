/**
 * The web build — the shipping target — can't schedule local notifications on iOS,
 * so it doesn't ship expo-notifications at all (~37 KB). Same API as
 * notifications.ts; the Reminder sheet reads `remindersSupported` and says so.
 */
export const remindersSupported = false;

export function addReminderTapListener(_onTap: () => void): () => void {
  return () => {};
}

export async function scheduleNightlyReminder(_hour: number, _minute: number): Promise<boolean> {
  return false;
}

export async function cancelNightlyReminder(): Promise<void> {}

/** "23:30" -> { hour: 23, minute: 30 }. Falls back to 11:30 PM on bad input. */
export function parseReminderTime(value: string): { hour: number; minute: number } {
  const [h, m] = value.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return { hour: 23, minute: 30 };
  return { hour: h, minute: m };
}

export function formatReminderTime(hour: number, minute: number): string {
  return `${hour}:${minute < 10 ? `0${minute}` : minute}`;
}
