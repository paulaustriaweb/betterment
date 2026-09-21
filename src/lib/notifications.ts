import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

/**
 * One daily reminder, replacing any previous one. iOS will not let this override
 * silent mode or force interaction — it's a nudge, not an alarm. The pressure
 * comes from the gaps on Agenda.
 */
export async function scheduleNightlyReminder(hour: number, minute: number): Promise<boolean> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!(await ensurePermission())) return false;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'How did today actually go?',
      body: 'Log tonight before the day blurs.',
      data: { route: '/log' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
  return true;
}

export async function cancelNightlyReminder(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/** "23:30" -> { hour: 23, minute: 30 }. Falls back to 11:30 PM on bad input. */
export function parseReminderTime(value: string): { hour: number; minute: number } {
  const [h, m] = value.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return { hour: 23, minute: 30 };
  return { hour: h, minute: m };
}

export function formatReminderTime(hour: number, minute: number): string {
  return `${hour}:${minute < 10 ? `0${minute}` : minute}`;
}
