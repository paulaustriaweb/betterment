import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import { LayoutAnimation, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AddGoalSheet } from '@/components/AddGoalSheet';
import { Banner } from '@/components/Banner';
import { CheckIcon, GoalsIcon, PlusIcon } from '@/components/icons';
import { SwipeRow } from '@/components/SwipeRow';
import { DisclosureRow, PrimaryButton, ScreenHeader, Sheet } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { useGoals } from '@/hooks/useGoals';
import { useSetting } from '@/hooks/useSettings';
import { useNow } from '@/hooks/useNow';
import { colors, font, spacing, type } from '@/lib/colors';
import { countdownLabel, daysUntil, goalProgress, sortByDeadline, urgencyOf } from '@/lib/goals';
import type { Goal } from '@/lib/types';

export default function GoalsScreen() {
  const now = useNow();
  const { goals, loaded, add, update, setComplete, remove } = useGoals();
  const toast = useToast();
  const [weekStart] = useSetting('week_starts_on', '0');
  const [editing, setEditing] = useState<Goal | null>(null);
  const [doneOpen, setDoneOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const active = useMemo(() => sortByDeadline(goals.filter((g) => !g.isComplete)), [goals]);
  const completed = useMemo(() => goals.filter((g) => g.isComplete), [goals]);

  const next = active[0];
  // The hero already carries the nearest deadline — the list shows what's behind it.
  // All of them: capping the slice hid later goals with no way to reach them.
  const upcoming = active.slice(1);

  async function toggle(id: number, complete: boolean) {
    try {
      Haptics.notificationAsync(
        complete ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning
      );
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      await setComplete(id, complete);
      setNotice(null);
      toast(complete ? 'Done — nice.' : 'Back on the list.', {
        action: { label: 'Undo', onPress: () => setComplete(id, !complete) },
      });
    } catch (error) {
      console.error('goal toggle failed', error);
      setNotice("Couldn't update that — try again.");
      toast("Couldn't update that — try again.", { tone: 'danger' });
    }
  }

  async function saveGoal(title: string, deadlineIso: string, id?: number) {
    if (id) {
      await update(id, title, deadlineIso);
      toast('Goal updated.');
    } else {
      await add(title, deadlineIso);
      toast('Goal added.');
    }
  }

  async function handleDelete(goal: Goal) {
    try {
      await remove(goal.id);
      setNotice(null);
      // Undo rather than a confirm sheet, per the States board.
      toast(`Deleted "${goal.title}".`, {
        // Its original created date comes back too, so the progress bar does.
        action: { label: 'Undo', onPress: () => add(goal.title, goal.deadline, goal.createdAt) },
      });
    } catch (error) {
      // An unhandled throw here left the row sitting there looking frozen.
      console.error('goal delete failed', error);
      setNotice("Couldn't delete that — try again.");
      toast("Couldn't delete that — try again.", { tone: 'danger' });
    }
  }

  const nextDays = next ? daysUntil(next.deadline, now) : 0;
  const nextUrgency = urgencyOf(nextDays);

  // Hold the hero back until the first read lands, rather than flash "No deadlines".
  if (!loaded) return <View style={styles.screen} />;

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <ScreenHeader
          title="Goals"
          subtitle={`${active.length} active · ${completed.length} done`}
        />

        <View style={styles.hero}>
          <View style={styles.heroLabelRow}>
            <View style={styles.heroChip}>
              <GoalsIcon color={colors.surface} size={14} strokeWidth={2.4} />
            </View>
            <Text style={styles.heroLabel}>{next ? 'Next deadline' : 'No deadlines'}</Text>
          </View>

          {next ? (
            <>
              <View style={styles.heroCountRow}>
                <Text style={styles.heroValue}>
                  {nextUrgency === 'overdue' ? Math.abs(nextDays) : nextDays}
                </Text>
                <Text style={styles.heroUnit}>
                  {nextUrgency === 'overdue' ? 'days over' : nextDays === 1 ? 'day left' : 'days left'}
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  setEditing(next);
                  setAddOpen(true);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Edit "${next.title}"`}
              >
                <Text style={styles.heroTitle}>{next.title}</Text>
              </Pressable>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${goalProgress(next.createdAt, next.deadline, now) * 100}%` },
                  ]}
                />
              </View>
              <Text style={styles.heroDue}>Due {format(new Date(next.deadline), 'EEEE, MMM d')}</Text>
            </>
          ) : (
            <Text style={styles.heroEmpty}>
              Nothing scheduled. A deadline is what turns an intention into a date.
            </Text>
          )}
        </View>

        {upcoming.length > 0 ? (
          <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
            {upcoming.map((g) => {
              const days = daysUntil(g.deadline, now);
              const soon = urgencyOf(days) !== 'later';
              return (
                <View key={g.id} style={styles.card}>
                  <Pressable
                    style={styles.checkbox}
                    onPress={() => toggle(g.id, true)}
                    hitSlop={8}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: false }}
                    accessibilityLabel={`Mark "${g.title}" done`}
                  />
                  <Pressable
                    style={{ flex: 1 }}
                    onPress={() => {
                      setEditing(g);
                      setAddOpen(true);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Edit "${g.title}"`}
                  >
                    <Text style={styles.cardTitle}>{g.title}</Text>
                    <Text style={styles.cardDate}>{format(new Date(g.deadline), 'MMM d')}</Text>
                  </Pressable>
                  <View style={[styles.pill, soon && styles.pillSoon]}>
                    <Text style={[styles.pillText, soon && styles.pillTextSoon]}>{countdownLabel(days)}</Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        ) : null}

        <View style={styles.disclosure}>
          <DisclosureRow
            icon={<CheckIcon color={colors.rose} />}
            title="Completed"
            hint={completed.length === 0 ? 'Nothing finished yet' : `${completed.length} done · tap to see`}
            onPress={() => setDoneOpen(true)}
          />
        </View>

        <View style={styles.action}>
          <PrimaryButton
            label="Add goal"
            onPress={() => {
              setEditing(null);
              setAddOpen(true);
            }}
            icon={<PlusIcon color={colors.surface} />}
          />
        </View>
      </View>

      <Sheet
        visible={doneOpen}
        title="Completed"
        subtitle="Tap one to bring it back"
        onClose={() => setDoneOpen(false)}
      >
        {notice ? (
          <View style={styles.banner}>
            <Banner message={notice} />
          </View>
        ) : null}

        {completed.length === 0 ? (
          <Text style={styles.empty}>Nothing finished yet.</Text>
        ) : (
          <ScrollView style={styles.doneScroll}>
            {completed.map((g) => (
              <SwipeRow key={g.id} onDelete={() => handleDelete(g)}>
                <Pressable
                  style={({ pressed }) => [styles.doneRow, pressed && styles.rowPressed]}
                  onPress={() => toggle(g.id, false)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: true }}
                  accessibilityLabel={`"${g.title}" is done. Tap to bring it back.`}
                >
                  <View style={styles.doneCheck}>
                    <CheckIcon color={colors.surface} size={13} strokeWidth={3} />
                  </View>
                  <Text style={styles.doneTitle}>{g.title}</Text>
                </Pressable>
              </SwipeRow>
            ))}
            <Text style={styles.hint}>Tap to restore · swipe left to delete</Text>
          </ScrollView>
        )}
      </Sheet>

      <AddGoalSheet
        visible={addOpen}
        editing={editing}
        weekStartsOn={weekStart === '1' ? 1 : 0}
        onClose={() => setAddOpen(false)}
        onSave={saveGoal}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ground },
  content: { flex: 1, paddingTop: 26, paddingHorizontal: spacing.gutter },

  hero: { backgroundColor: colors.rose, borderRadius: 26, padding: 20, marginTop: 18 },
  heroLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  heroChip: {
    width: 26,
    height: 26,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLabel: { ...type.label, fontSize: 12.5, color: colors.surface },
  heroCountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 9, marginTop: 15 },
  heroValue: { ...type.display, fontSize: 48, letterSpacing: -2.2, color: colors.surface, fontVariant: ['tabular-nums'] },
  heroUnit: { fontFamily: font.regular, fontSize: 14, color: 'rgba(255,255,255,0.82)' },
  heroTitle: { fontFamily: font.semibold, fontSize: 13.5, color: colors.surface, marginTop: 8 },
  heroDue: { fontFamily: font.regular, fontSize: 11.5, color: 'rgba(255,255,255,0.75)', marginTop: 10 },
  heroEmpty: { fontFamily: font.regular, fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 14, lineHeight: 19 },

  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginTop: 14,
    overflow: 'hidden',
  },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: colors.surface },

  list: { marginTop: 16, maxHeight: 222 },
  listContent: { gap: 8 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 15,
  },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#E4CBD4' },
  cardTitle: { fontFamily: font.semibold, fontSize: 13.5, color: colors.ink },
  cardDate: { fontFamily: font.regular, fontSize: 11, color: colors.inkSoft, marginTop: 1 },
  pill: { borderRadius: 11, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#F3EAED' },
  pillSoon: { backgroundColor: colors.roseTint },
  pillText: { fontFamily: font.bold, fontSize: 11, color: colors.inkSoft, fontVariant: ['tabular-nums'] },
  pillTextSoon: { color: colors.roseDeep },

  disclosure: { marginTop: 16 },
  action: { marginTop: 'auto', marginBottom: 20 },

  doneScroll: { marginTop: 14, maxHeight: 320 },
  doneRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  rowPressed: { opacity: 0.55 },
  doneCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.rose,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneTitle: { flex: 1, fontFamily: font.regular, fontSize: 13, color: colors.inkFaint, textDecorationLine: 'line-through' },

  banner: { marginTop: 12 },
  empty: { fontFamily: font.regular, fontSize: 13, color: colors.inkSoft, paddingVertical: 24 },
  hint: { fontFamily: font.regular, fontSize: 11, color: colors.inkFaint, paddingVertical: 14 },
});
