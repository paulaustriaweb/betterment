import * as Haptics from 'expo-haptics';

/**
 * Every tap-feedback in the app goes through here so Settings can turn it off.
 * A module flag rather than a hook: feedback fires from gesture callbacks and
 * handlers, not render. Set from the stored setting at startup and on change.
 */
let enabled = true;

export function setHapticsEnabled(on: boolean): void {
  enabled = on;
}

// Feedback is decoration: a device without it (or a browser that refuses) must
// never turn a tap into an unhandled rejection.
function fire(effect: () => Promise<void>): void {
  if (!enabled) return;
  effect().catch(() => undefined);
}

export function tick(): void {
  fire(() => Haptics.selectionAsync());
}

export function success(): void {
  fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

export function warning(): void {
  fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
}
