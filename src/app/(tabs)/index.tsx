import { addDays, addMonths, addWeeks, format, isSameDay, startOfDay, startOfMonth, startOfWeek, subDays } from 'date-fns';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CategoriesSheet } from '@/components/CategoriesSheet';
import { CategoryBar } from '@/components/CategoryBar';
import { ReminderSheet } from '@/components/ReminderSheet';
import { SettingsSheet } from '@/components/SettingsSheet';
import { GearIcon, PlusIcon, TimelineIcon } from '@/components/icons';
import { DisclosureRow, PrimaryButton, RangePills, ScreenHeader, Sheet, StatCard } from '@/components/ui';
import { useCategories } from '@/hooks/useCategories';
import { useNow } from '@/hooks/useNow';
import { useSetting } from '@/hooks/useSettings';
import { useTimeBlocksForRange, useTrackingStart } from '@/hooks/useTimeBlocks';
import { colors, font, spacing, type } from '@/lib/colors';
import { fitFontSize } from '@/lib/fit';
import { backupDue } from '@/lib/backupDue';
import { buildReport } from '@/lib/report';
import { formatDuration, formatHoursPadded, greeting } from '@/lib/time';

/**
 * Until 5 AM the day being logged is the one just ending, not the few minutes of the
 * new one — so "Today" becomes "Tonight" and reaches back to yesterday morning.
 */
const NIGHT_ENDS_HOUR = 5;

/**
 * A report of where the time went — logged once a night, read the next morning.
 * It used to lead with the hours *not* logged, which at 3 PM is every hour since
 * waking: true, and no use to someone who logs their whole day before bed.
 */
export default function OverviewScreen() {
  const router = useRouter();
  const now = useNow();
  const [range, setRange] = useState('today');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  const [weekStartSetting] = useSetting('week_starts_on', '0');
  const weekStartsOn = weekStartSetting === '1' ? 1 : 0;
  const categories = useCategories();
  const trackingStart = useTrackingStart();
  const [lastBackup] = useSetting('last_backup_at', '');
  const needsBackup = backupDue(lastBackup ? new Date(lastBackup) : null, trackingStart, now);

  const lateNight = now.getHours() < NIGHT_ENDS_HOUR;
  const ranges = [
    { key: 'today', label: lateNight ? 'Tonight' : 'Today' },
    { key: 'week', label: 'This week' },
    { key: 'month', label: 'This month' },
  ];

  const { rangeStart, rangeEnd } = useMemo(() => {
    if (range === 'week') {
      const s = startOfWeek(now, { weekStartsOn });
      return { rangeStart: s, rangeEnd: addWeeks(s, 1) };
    }
    if (range === 'month') {
      const s = startOfMonth(now);
      return { rangeStart: s, rangeEnd: addMonths(s, 1) };
    }
    const s = startOfDay(now);
    if (lateNight) return { rangeStart: subDays(s, 1), rangeEnd: addDays(s, 1) };
    return { rangeStart: s, rangeEnd: addDays(s, 1) };
  }, [range, now, weekStartsOn, lateNight]);

  const { blocks, loaded } = useTimeBlocksForRange(rangeStart, rangeEnd);
  const report = useMemo(
    () => buildReport(blocks, rangeStart, rangeEnd, now, trackingStart),
    [blocks, rangeStart, rangeEnd, now, trackingStart]
  );

  const nameOf = (id: number) => categories.find((c) => c.id === id)?.name ?? 'Other';
  const colorOf = (id: number) => categories.find((c) => c.id === id)?.color ?? colors.inkFaint;
  const sliceTotal = report.slices.reduce((sum, s) => sum + s.minutes, 0);
  const share = (minutes: number) => (sliceTotal > 0 ? Math.round((minutes / sliceTotal) * 100) : 0);
  const leader = report.slices[0];
  const isToday = range === 'today';

  const rangeCaption = isToday
    ? lateNight
      ? `${format(rangeStart, 'EEE, MMM d')} – now`
      : format(now, 'EEE, MMM d')
    : range === 'week'
      ? `${format(rangeStart, 'MMM d')} – ${format(subDays(rangeEnd, 1), 'MMM d')}`
      : format(rangeStart, 'MMMM');

  const heroCaption = leader
    ? `${nameOf(leader.categoryId)} leads · ${share(leader.minutes)}% of what you logged`
    : isToday
      ? 'Nothing yet — log your day before bed.'
      : `Nothing logged ${range === 'week' ? 'this week' : 'this month'} yet.`;

  // Today: what led, and where tonight's logging picks up. Longer ranges: the
  // average day, and what went unlogged on days that are already over.
  const leftCard = isToday
    ? { label: leader ? nameOf(leader.categoryId) : 'Top activity', value: leader ? formatHoursPadded(leader.minutes) : '—' }
    : {
        label: 'Daily average',
        value: report.trackedDays > 0 ? formatHoursPadded(report.logged / report.trackedDays) : '—',
      };
  const until = report.loggedUntil;
  const rightCard = isToday
    ? {
        label: 'Logged until',
        value: until ? format(until, isSameDay(until, now) ? 'h:mm a' : 'EEE h:mm a') : '—',
      }
    : { label: 'Not logged', value: trackingStart ? formatDuration(report.unloggedPast) : '—' };

  // One blank frame on a cold start beats a report computed from nothing.
  if (!loaded) return <View style={styles.screen} />;

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <ScreenHeader
          title={greeting(now)}
          subtitle={format(now, 'EEEE, MMMM d')}
          right={
            <Pressable
              style={styles.bell}
              onPress={() => setSettingsOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={needsBackup ? 'Settings. A backup is due.' : 'Settings'}
            >
              <GearIcon color={colors.inkSoft} />
              {needsBackup ? <View style={styles.dueDot} /> : null}
            </Pressable>
          }
        />

        <View style={styles.pills}>
          <RangePills options={ranges} value={range} onChange={setRange} />
        </View>

        <View style={styles.hero} accessible accessibilityLabel={`Logged ${formatDuration(report.logged)}. ${heroCaption}`}>
          <View style={styles.heroTop}>
            <View style={styles.heroLabelRow}>
              <View style={styles.heroChip}>
                <TimelineIcon color={colors.surface} size={14} />
              </View>
              <Text style={styles.heroLabel}>Logged</Text>
            </View>
            <Text style={styles.heroRange}>{rangeCaption}</Text>
          </View>

          <Text
            style={[styles.heroValue, { fontSize: fitFontSize(formatHoursPadded(report.logged), 48, 8) }]}
            numberOfLines={1}
          >
            {formatHoursPadded(report.logged)}
          </Text>

          <View style={styles.bar}>
            <CategoryBar slices={report.slices} categories={categories} />
          </View>
          <Text style={styles.heroSub} numberOfLines={2}>
            {heroCaption}
          </Text>
        </View>

        <View style={styles.statRow}>
          <StatCard label={leftCard.label} value={leftCard.value} tone="ink" />
          <StatCard label={rightCard.label} value={rightCard.value} tone="pop" />
        </View>

        <View style={styles.disclosure}>
          <DisclosureRow
            icon={<TimelineIcon color={colors.rose} />}
            title="Where it went"
            hint={
              report.slices.length === 0
                ? 'Nothing logged yet'
                : `${report.slices.length} ${report.slices.length === 1 ? 'activity' : 'activities'} · tap to see`
            }
            onPress={() => setSheetOpen(true)}
          />
        </View>

        <View style={styles.action}>
          <PrimaryButton
            label={isToday && !leader ? 'Log your day' : 'Add time'}
            onPress={() => router.push('/log')}
            icon={<PlusIcon color={colors.surface} />}
          />
        </View>
      </View>

      <Sheet visible={sheetOpen} title="Where it went" subtitle={rangeCaption} onClose={() => setSheetOpen(false)}>
        {report.slices.length === 0 ? (
          <Text style={styles.empty}>Nothing logged here yet.</Text>
        ) : (
          <ScrollView style={styles.sheetScroll}>
            {report.slices.map((s) => {
              const pct = share(s.minutes);
              return (
                <View key={s.categoryId} style={styles.breakdownRow}>
                  <View style={styles.breakdownTop}>
                    <View style={[styles.dot, { backgroundColor: colorOf(s.categoryId) }]} />
                    <Text style={styles.breakdownLabel}>{nameOf(s.categoryId)}</Text>
                    <Text style={styles.breakdownValue}>{formatDuration(s.minutes)}</Text>
                    <Text style={styles.breakdownPct}>{pct}%</Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: colorOf(s.categoryId) }]} />
                  </View>
                </View>
              );
            })}
            {!isToday && report.unloggedPast > 0 ? (
              <Text style={styles.footnote}>
                {formatDuration(report.unloggedPast)} went unlogged on days that are over. Tap a gap on Day to fill
                it in.
              </Text>
            ) : null}
          </ScrollView>
        )}
      </Sheet>

      <SettingsSheet
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onOpenReminder={() => {
          setSettingsOpen(false);
          setReminderOpen(true);
        }}
        onOpenCategories={() => {
          setSettingsOpen(false);
          setCategoriesOpen(true);
        }}
      />
      <ReminderSheet visible={reminderOpen} onClose={() => setReminderOpen(false)} />
      <CategoriesSheet visible={categoriesOpen} onClose={() => setCategoriesOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ground },
  content: { flex: 1, paddingTop: 26, paddingHorizontal: spacing.gutter },

  pills: { marginTop: 18 },
  dueDot: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.rosePop,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  bell: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  hero: { backgroundColor: colors.rose, borderRadius: 26, padding: 20, marginTop: 18 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
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
  heroRange: { fontFamily: font.regular, fontSize: 11, color: 'rgba(255,255,255,0.75)' },
  heroValue: {
    ...type.display,
    fontSize: 48,
    letterSpacing: -2.2,
    color: colors.surface,
    marginTop: 16,
    fontVariant: ['tabular-nums'],
  },
  bar: { marginTop: 16 },
  heroSub: { fontFamily: font.regular, fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 10, lineHeight: 17 },

  statRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  disclosure: { marginTop: 18 },
  action: { marginTop: 'auto', marginBottom: 20 },

  sheetScroll: { marginTop: 16, maxHeight: 360 },
  breakdownRow: { marginBottom: 15 },
  breakdownTop: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  breakdownLabel: { flex: 1, fontFamily: font.medium, fontSize: 13, color: colors.ink },
  breakdownValue: { fontFamily: font.bold, fontSize: 13, color: colors.ink, fontVariant: ['tabular-nums'] },
  breakdownPct: {
    width: 38,
    textAlign: 'right',
    fontFamily: font.regular,
    fontSize: 11.5,
    color: colors.inkSoft,
    fontVariant: ['tabular-nums'],
  },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: '#F6EDF0', marginTop: 7, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  footnote: { fontFamily: font.regular, fontSize: 11.5, color: colors.inkSoft, lineHeight: 17, marginTop: 4, marginBottom: 8 },

  empty: { fontFamily: font.regular, fontSize: 13, color: colors.inkSoft, paddingVertical: 20 },
});
