import { addMinutes, differenceInMinutes, format, isSameDay } from 'date-fns';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { TimeBlockInput } from '@/db/timeBlocks';
import { useSubmitGuard } from '@/hooks/useSubmitGuard';
import { colors, font, radius } from '@/lib/colors';
import * as haptics from '@/lib/haptics';
import { formatDuration } from '@/lib/time';
import { clockAfter } from '@/lib/timeInput';
import type { Category } from '@/lib/types';
import { Banner } from './Banner';
import { TimeField } from './TimeField';
import { PrimaryButton, Sheet } from './ui';

const QUICK = [30, 60, 120];
/** Within this of now counts as caught up — nobody logs the last three minutes. */
const CAUGHT_UP = 5;

interface Props {
  visible: boolean;
  /** Where the walk begins — normally where the last entry ended. */
  start: Date;
  now: Date;
  categories: Category[];
  add: (input: TimeBlockInput) => Promise<number>;
  remove: (id: number) => Promise<void>;
  onClose: () => void;
}

interface Step {
  id: number;
  start: Date;
  minutes: number;
}

/**
 * Logging a whole day as a conversation: "From 7:00 AM — until when, doing what?"
 * Picking the activity saves that stretch and moves on to the next, until the day
 * is caught up to now. Back undoes the last one; Skip leaves a gap on purpose.
 */
export function WalkthroughSheet({ visible, start, now, categories, add, remove, onClose }: Props) {
  const [cursor, setCursor] = useState(start);
  const [untilChoice, setUntil] = useState<Date | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const submit = useSubmitGuard(250);

  // The sheet stays mounted; start fresh each time it opens — only then. Every save
  // moves `start` (it follows the latest entry), and resetting on that wiped the
  // step history and left Back with nothing to undo. Adjusted during render, not
  // synced in an effect.
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setCursor(start);
      setUntil(null);
      setSteps([]);
      setNotice(null);
    }
  }

  // Opened straight from a link, the sheet can mount before the latest entry has
  // loaded, so `start` arrives late. Until anything is logged or skipped, follow it.
  const [startSeen, setStartSeen] = useState(start.getTime());
  if (start.getTime() !== startSeen) {
    setStartSeen(start.getTime());
    if (steps.length === 0 && cursor.getTime() === startSeen) {
      setCursor(start);
      setUntil(null);
    }
  }

  const left = differenceInMinutes(now, cursor);
  const caughtUp = left <= CAUGHT_UP;
  const until = untilChoice ?? addMinutes(cursor, Math.max(15, Math.min(60, left)));
  const loggedMinutes = steps.reduce((sum, s) => sum + s.minutes, 0);

  function advance(to: Date) {
    setCursor(to);
    setUntil(null);
    setNotice(null);
  }

  function logAs(category: Category) {
    if (until <= cursor) {
      setNotice('The end has to be after the start.');
      return;
    }
    const from = cursor;
    const to = until;
    submit(async () => {
      try {
        const id = await add({ startTime: from.toISOString(), endTime: to.toISOString(), categoryId: category.id, note: null });
        haptics.tick();
        setSteps((prev) => [...prev, { id, start: from, minutes: differenceInMinutes(to, from) }]);
        advance(to);
      } catch (error) {
        console.error('walkthrough save failed', error);
        setNotice("Couldn't save that — try again.");
      }
    });
  }

  function back() {
    const last = steps[steps.length - 1];
    if (!last) return;
    submit(async () => {
      try {
        await remove(last.id);
        setSteps((prev) => prev.slice(0, -1));
        advance(last.start);
      } catch (error) {
        console.error('walkthrough undo failed', error);
        setNotice("Couldn't undo that — try again.");
      }
    });
  }

  const dayLabel = isSameDay(cursor, now) ? '' : `${format(cursor, 'EEE')} `;

  return (
    <Sheet
      visible={visible}
      title="Walk through your day"
      subtitle={caughtUp ? 'Caught up to now' : `${formatDuration(left)} left to log`}
      onClose={onClose}
    >
      {caughtUp ? (
        <View style={styles.done}>
          <Text style={styles.doneTitle}>You&apos;re caught up.</Text>
          <Text style={styles.doneBody}>
            {steps.length === 0
              ? 'Everything up to now is already logged.'
              : `Logged ${formatDuration(loggedMinutes)} in ${steps.length} ${steps.length === 1 ? 'entry' : 'entries'}.`}
          </Text>
          <View style={styles.doneAction}>
            <PrimaryButton label="Done" onPress={onClose} />
          </View>
          {steps.length > 0 ? (
            <Pressable style={styles.link} onPress={back} accessibilityRole="button">
              <Text style={styles.linkLabel}>Undo the last one</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.from}>
              From <Text style={styles.fromTime}>{dayLabel}{format(cursor, 'h:mm a')}</Text>
            </Text>
            <View style={styles.fieldRow}>
              <TimeField
                label="Until"
                value={until}
                hint={isSameDay(until, cursor) ? formatDuration(differenceInMinutes(until, cursor)) : 'next day'}
                onCommit={(clock) => setUntil(clockAfter(clock, cursor))}
                onFlip={() => setUntil(addMinutes(until, until.getHours() < 12 ? 720 : -720))}
              />
            </View>
            <View style={styles.quickRow}>
              {QUICK.map((m) => (
                <Pressable
                  key={m}
                  style={styles.quick}
                  onPress={() => setUntil(addMinutes(cursor, m))}
                  accessibilityRole="button"
                  accessibilityLabel={`Until ${formatDuration(m)} later`}
                >
                  <Text style={styles.quickLabel}>+{formatDuration(m)}</Text>
                </Pressable>
              ))}
              <Pressable
                style={[styles.quick, styles.quickNow]}
                onPress={() => setUntil(now)}
                accessibilityRole="button"
                accessibilityLabel="Until now"
              >
                <Text style={[styles.quickLabel, styles.quickNowLabel]}>Now</Text>
              </Pressable>
            </View>
          </View>

          <Text style={styles.question}>What were you doing? Tap to log it.</Text>
          <View style={styles.grid}>
            {categories
              .filter((c) => c.isActive)
              .map((c) => (
                <Pressable
                  key={c.id}
                  style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
                  onPress={() => logAs(c)}
                  accessibilityRole="button"
                  accessibilityLabel={`Log ${c.name} until ${format(until, 'h:mm a')}`}
                >
                  <View style={[styles.dot, { backgroundColor: c.color }]} />
                  <Text style={styles.optionLabel} numberOfLines={1}>
                    {c.name}
                  </Text>
                </Pressable>
              ))}
          </View>

          {notice ? (
            <View style={styles.banner}>
              <Banner message={notice} />
            </View>
          ) : null}

          <View style={styles.footer}>
            <Pressable
              style={[styles.footerButton, steps.length === 0 && styles.disabled]}
              onPress={back}
              disabled={steps.length === 0}
              accessibilityRole="button"
              accessibilityLabel="Back — undo the last entry"
            >
              <Text style={styles.footerLabel}>Back</Text>
            </Pressable>
            <Text style={styles.progress}>
              {steps.length === 0 ? 'Nothing logged yet' : `${steps.length} logged · ${formatDuration(loggedMinutes)}`}
            </Text>
            <Pressable
              style={styles.footerButton}
              onPress={() => advance(until)}
              accessibilityRole="button"
              accessibilityLabel="Skip — leave this stretch unlogged"
            >
              <Text style={styles.footerLabel}>Skip</Text>
            </Pressable>
          </View>
        </>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.rose, borderRadius: 22, padding: 16, marginTop: 16 },
  from: { fontFamily: font.semibold, fontSize: 12.5, color: 'rgba(255,255,255,0.85)' },
  fromTime: { fontFamily: font.bold, color: colors.surface },
  fieldRow: { flexDirection: 'row', marginTop: 10 },
  quickRow: { flexDirection: 'row', gap: 7, marginTop: 10 },
  quick: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.18)' },
  quickNow: { backgroundColor: colors.surface },
  quickLabel: { fontFamily: font.semibold, fontSize: 12, color: colors.surface },
  quickNowLabel: { color: colors.rose },

  question: { fontFamily: font.semibold, fontSize: 13, color: colors.ink, marginTop: 16, marginBottom: 9 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.ground,
    borderRadius: radius.control,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  optionPressed: { backgroundColor: colors.roseTint },
  dot: { width: 9, height: 9, borderRadius: 5 },
  optionLabel: { flex: 1, fontFamily: font.medium, fontSize: 13, color: colors.ink },

  banner: { marginTop: 12 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  footerButton: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 16, backgroundColor: colors.ground },
  footerLabel: { fontFamily: font.semibold, fontSize: 12.5, color: colors.ink },
  disabled: { opacity: 0.4 },
  progress: { fontFamily: font.regular, fontSize: 11.5, color: colors.inkSoft },

  done: { paddingTop: 20 },
  doneTitle: { fontFamily: font.bold, fontSize: 19, color: colors.ink },
  doneBody: { fontFamily: font.regular, fontSize: 13, color: colors.inkSoft, marginTop: 6, lineHeight: 19 },
  doneAction: { marginTop: 20 },
  link: { alignItems: 'center', paddingVertical: 12 },
  linkLabel: { fontFamily: font.semibold, fontSize: 13, color: colors.inkSoft },
});
