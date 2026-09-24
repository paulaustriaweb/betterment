import { differenceInCalendarDays } from 'date-fns';

/**
 * Whether it's time to save a backup. Browser storage can be wiped by "clear website
 * data" or a lost phone, and the file is the only copy that survives. Due a week
 * after the last one, or three days into using the app if there has never been one.
 */
export function backupDue(lastBackup: Date | null, trackingStart: Date | null, now: Date): boolean {
  if (!trackingStart) return false;
  if (!lastBackup) return differenceInCalendarDays(now, trackingStart) >= 3;
  return differenceInCalendarDays(now, lastBackup) >= 7;
}
