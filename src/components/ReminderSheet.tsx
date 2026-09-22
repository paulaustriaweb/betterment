import { format } from 'date-fns';
import { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { useSetting } from '@/hooks/useSettings';
import { colors, font } from '@/lib/colors';
import {
  cancelNightlyReminder,
  formatReminderTime,
  parseReminderTime,
  remindersSupported,
  scheduleNightlyReminder,
} from '@/lib/notifications';
import { useToast } from './Toast';
import { Sheet, Stepper } from './ui';

const STEP = 15;

export function ReminderSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [time, setTime] = useSetting('reminder_time', '23:30');
  const [enabled, setEnabled] = useSetting('reminder_enabled', '0');
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const { hour, minute } = parseReminderTime(time);
  const on = enabled === '1' && remindersSupported;

  async function apply(nextOn: boolean, h: number, m: number) {
    if (!nextOn) {
      await cancelNightlyReminder();
      setDenied(false);
      return;
    }
    const scheduled = await scheduleNightlyReminder(h, m);
    setDenied(!scheduled);
    if (!scheduled) setEnabled('0');
  }

  function toggle(next: boolean) {
    try {
      setEnabled(next ? '1' : '0');
      setError(null);
      toast(next ? 'Reminder on.' : 'Reminder off.');
    } catch (e) {
      console.error('reminder toggle failed', e);
      setError("Couldn't save that — try again.");
      return;
    }
    void apply(next, hour, minute);
  }

  function shift(delta: number) {
    const total = (hour * 60 + minute + delta + 1440) % 1440;
    const h = Math.floor(total / 60);
    const m = total % 60;
    try {
      setTime(formatReminderTime(h, m));
      setError(null);
    } catch (e) {
      console.error('reminder time save failed', e);
      setError("Couldn't save that — try again.");
      return;
    }
    if (on) void apply(true, h, m);
  }

  return (
    <Sheet visible={visible} title="Nightly reminder" subtitle="One nudge, then it leaves you alone" onClose={onClose}>
      <View style={styles.toggleRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.toggleTitle}>Remind me each night</Text>
          <Text style={styles.toggleHint}>
            {remindersSupported ? (on ? 'On' : 'Off') : 'Unavailable here'}
          </Text>
        </View>
        <Switch
          value={on}
          onValueChange={toggle}
          disabled={!remindersSupported}
          trackColor={{ true: colors.rose, false: '#E4CBD4' }}
          thumbColor={colors.surface}
          accessibilityLabel="Remind me each night"
        />
      </View>

      <View style={styles.timeRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.timeLabel}>Time</Text>
          <Text style={[styles.timeValue, !on && styles.timeValueOff]}>
            {format(new Date(2026, 0, 1, hour, minute), 'h:mm a')}
          </Text>
        </View>
        <View style={styles.steppers}>
          <Stepper direction="down" label="15 minutes earlier" onPress={() => shift(-STEP)} />
          <Stepper direction="up" label="15 minutes later" onPress={() => shift(STEP)} />
        </View>
      </View>

      {error ? <Text style={styles.denied}>{error}</Text> : null}

      {!remindersSupported ? (
        <Text style={styles.note}>
          A home-screen web app gets no scheduled notifications on iOS, so this can&apos;t fire here. Seeing the
          empty hours on Your day is what actually gets you logging anyway.
        </Text>
      ) : denied ? (
        <Text style={styles.denied}>
          iOS denied notification permission. Turn it on in Settings › Notifications.
        </Text>
      ) : (
        <Text style={styles.note}>
          iOS won&apos;t let this ring through silent mode or force you to answer. It&apos;s a nudge — seeing
          the empty hours on Your day is what actually gets you logging.
        </Text>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  toggleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 20 },
  toggleTitle: { fontFamily: font.semibold, fontSize: 14, color: colors.ink },
  toggleHint: { fontFamily: font.regular, fontSize: 11.5, color: colors.inkSoft, marginTop: 2 },

  timeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 22 },
  timeLabel: { fontFamily: font.regular, fontSize: 11.5, color: colors.inkSoft },
  timeValue: {
    fontFamily: font.bold,
    fontSize: 32,
    letterSpacing: -1.2,
    color: colors.ink,
    marginTop: 3,
    fontVariant: ['tabular-nums'],
  },
  timeValueOff: { color: colors.inkFaint },
  steppers: { flexDirection: 'row', gap: 8 },

  note: { fontFamily: font.regular, fontSize: 11.5, color: colors.inkSoft, lineHeight: 17, marginTop: 22 },
  denied: { fontFamily: font.medium, fontSize: 11.5, color: colors.danger, lineHeight: 17, marginTop: 22 },
});
