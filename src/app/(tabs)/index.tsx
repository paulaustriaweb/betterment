import {
  addDays,
  addMonths,
  addWeeks,
  differenceInMinutes,
  eachDayOfInterval,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
} from 'date-fns';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CategoriesSheet } from '@/components/CategoriesSheet';
import { ReminderSheet } from '@/components/ReminderSheet';
import { SettingsSheet } from '@/components/SettingsSheet';
import { Sparkline } from '@/components/Sparkline';
import { AlertIcon, GearIcon, PlusIcon } from '@/components/icons';
import { DisclosureRow, PrimaryButton, RangePills, ScreenHeader, Sheet, StatCard } from '@/components/ui';
import { useCategories } from '@/hooks/useCategories';
import { useNow } from '@/hooks/useNow';
import { useTimeBlocksForRange } from '@/hooks/useTimeBlocks';
import { colors, font, spacing, type } from '@/lib/colors';
import { fitFontSize } from '@/lib/fit';
import {
  greeting,
  formatDuration,
  formatHoursPadded,
  longestGapMinutes,
  loggedMinutesInRange,
  minutesByCategory,
  unaccountedMinutesInRange,
} from '@/lib/time';

const RANGES = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This week' },
  { key: 'month', label: 'This month' },
];

export default function OverviewScreen() {
  const router = useRouter();
  const now = useNow();
  const [range, setRange] = useState('today');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  const categories = useCategories();

  const { rangeStart, rangeEnd } = useMemo(() => {
    if (range === 'week') {
      const s = startOfWeek(now);
      return { rangeStart: s, rangeEnd: addWeeks(s, 1) };
    }
    if (range === 'month') {
      const s = startOfMonth(now);
      return { rangeStart: s, rangeEnd: addMonths(s, 1) };
    }
    const s = startOfDay(now);
    return { rangeStart: s, rangeEnd: addDays(s, 1) };
  }, [range, now]);

  const blocks = useTimeBlocksForRange(rangeStart, rangeEnd);

  // The sparkline is always a 7-day trend, whatever range the hero is showing.
  const trendStart = useMemo(() => startOfDay(subDays(now, 6)), [now]);
  const trendEnd = useMemo(() => addDays(startOfDay(now), 1), [now]);
  const trendBlocks = useTimeBlocksForRange(trendStart, trendEnd);

  const unaccounted = unaccountedMinutesInRange(blocks, rangeStart, rangeEnd);
  const logged = loggedMinutesInRange(blocks, rangeStart, rangeEnd);
  const totalMinutes = differenceInMinutes(rangeEnd, rangeStart);

  const trend = useMemo(
    () =>
      eachDayOfInterval({ start: trendStart, end: startOfDay(now) }).map(
        (d) => unaccountedMinutesInRange(trendBlocks, d, addDays(d, 1)) / 60
      ),
    [trendBlocks, trendStart, now]
  );

  const worstGap = useMemo(() => {
    // Days that haven't happened yet are trivially 24h unlogged, which would peg
    // this at "24h" for every week and month. Only scan up to today.
    const lastDay = subDays(rangeEnd, 1);
    const cutoff = startOfDay(now);
    const scanEnd = lastDay > cutoff ? cutoff : lastDay;
    if (scanEnd < rangeStart) return 0;
    const days = eachDayOfInterval({ start: rangeStart, end: scanEnd });
    return days.reduce((max, d) => Math.max(max, longestGapMinutes(blocks, d)), 0);
  }, [blocks, rangeStart, rangeEnd, now]);

  const breakdown = useMemo(() => {
    const totals = minutesByCategory(blocks, rangeStart, rangeEnd);
    const rows = categories
      .map((c) => ({
        key: `c${c.id}`,
        label: c.name,
        color: c.color,
        minutes: totals.get(c.id) ?? 0,
      }))
      .filter((r) => r.minutes > 0);
    rows.push({ key: 'unaccounted', label: 'Not logged', color: colors.rose, minutes: unaccounted });
    return rows.sort((a, b) => b.minutes - a.minutes);
  }, [blocks, categories, rangeStart, rangeEnd, unaccounted]);

  const leader = breakdown[0];
  const breakdownHint =
    breakdown.length === 0
      ? 'Nothing logged yet'
      : `${leader.label} leads at ${Math.round((leader.minutes / totalMinutes) * 100)}%`;

  const rangeLabel = RANGES.find((r) => r.key === range)?.label ?? 'Today';

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <ScreenHeader
          title={greeting(now)}
          subtitle={
            unaccounted === 0 ? 'Every hour is logged.' : `${formatDuration(unaccounted)} not logged yet`
          }
          right={
            <Pressable
              style={styles.bell}
              onPress={() => setSettingsOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Settings"
            >
              <GearIcon color={colors.inkSoft} />
            </Pressable>
          }
        />

        <View style={styles.pills}>
          <RangePills options={RANGES} value={range} onChange={setRange} />
        </View>

        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.heroLabelRow}>
              <View style={styles.heroChip}>
                <AlertIcon color={colors.surface} size={14} />
              </View>
              <Text style={styles.heroLabel}>Not logged</Text>
            </View>
            <Text style={styles.heroRange}>Last 7 days</Text>
          </View>

          <Text
            style={[styles.heroValue, { fontSize: fitFontSize(formatHoursPadded(unaccounted), 48, 8) }]}
            numberOfLines={1}
          >
            {formatHoursPadded(unaccounted)}
          </Text>
          <Text style={styles.heroSub}>
            of {Math.round(totalMinutes / 60)}h {rangeLabel.toLowerCase()}
          </Text>

          <View style={styles.spark}>
            <Sparkline values={trend} label={`${Math.round(trend[trend.length - 1] ?? 0)}h`} />
          </View>
        </View>

        <View style={styles.statRow}>
          <StatCard label="Logged" value={formatHoursPadded(logged)} tone="ink" />
          <StatCard label="Longest gap" value={formatDuration(worstGap)} tone="pop" />
        </View>

        <View style={styles.disclosure}>
          <DisclosureRow
            icon={<AlertIcon color={colors.rose} />}
            title="Where it went"
            hint={breakdownHint}
            onPress={() => setSheetOpen(true)}
          />
        </View>

        <View style={styles.action}>
          <PrimaryButton
            label="Add time"
            onPress={() => router.push('/log')}
            icon={<PlusIcon color={colors.surface} />}
          />
        </View>
      </View>

      <Sheet visible={sheetOpen} title="Where it went" subtitle={rangeLabel} onClose={() => setSheetOpen(false)}>
        {breakdown.length === 0 ? (
          <Text style={styles.empty}>Nothing logged here yet.</Text>
        ) : (
          <ScrollView style={styles.sheetScroll}>
            {breakdown.map((row) => {
              const pct = Math.round((row.minutes / totalMinutes) * 100);
              return (
                <View key={row.key} style={styles.breakdownRow}>
                  <View style={styles.breakdownTop}>
                    <View style={[styles.dot, { backgroundColor: row.color }]} />
                    <Text style={styles.breakdownLabel}>{row.label}</Text>
                    <Text style={styles.breakdownValue}>{formatDuration(row.minutes)}</Text>
                    <Text style={styles.breakdownPct}>{pct}%</Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: row.color }]} />
                  </View>
                </View>
              );
            })}
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
  heroSub: { fontFamily: font.regular, fontSize: 12, color: 'rgba(255,255,255,0.78)', marginTop: 4 },
  spark: { marginTop: 12 },

  statRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  disclosure: { marginTop: 18 },
  action: { marginTop: 'auto', marginBottom: 20 },

  sheetScroll: { marginTop: 16, maxHeight: 340 },
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

  empty: { fontFamily: font.regular, fontSize: 13, color: colors.inkSoft, paddingVertical: 20 },
});
