import { addDays } from 'date-fns/addDays';
import { addMonths } from 'date-fns/addMonths';
import { addWeeks } from 'date-fns/addWeeks';
import { eachDayOfInterval } from 'date-fns/eachDayOfInterval';
import { format } from 'date-fns/format';
import { isSameDay } from 'date-fns/isSameDay';
import { startOfDay } from 'date-fns/startOfDay';
import { startOfMonth } from 'date-fns/startOfMonth';
import { startOfWeek } from 'date-fns/startOfWeek';
import { subDays } from 'date-fns/subDays';
import { subMonths } from 'date-fns/subMonths';
import { subWeeks } from 'date-fns/subWeeks';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { CategoriesSheet } from '@/components/CategoriesSheet';
import { ActivityChart } from '@/components/ActivityChart';
import { ReminderSheet } from '@/components/ReminderSheet';
import { SettingsSheet } from '@/components/SettingsSheet';
import { TargetsSheet } from '@/components/TargetsSheet';
import { WhereItWentSheet } from '@/components/WhereItWentSheet';
import { GearIcon, PlusIcon, TimelineIcon } from '@/components/icons';
import { DisclosureRow, PrimaryButton, RangePills, ScreenHeader, StatCard } from '@/components/ui';
import { useCategories } from '@/hooks/useCategories';
import { useNow } from '@/hooks/useNow';
import { useSetting } from '@/hooks/useSettings';
import { useTimeBlocksForRange, useTrackingStart } from '@/hooks/useTimeBlocks';
import { colors, font, spacing, type } from '@/lib/colors';
import { fitFontSize } from '@/lib/fit';
import { backupDue } from '@/lib/backupDue';
import { dailyColumns, hourlyColumns } from '@/lib/chartData';
import { awakeLate, biggestChange, compareSlices } from '@/lib/insights';
import { buildReport } from '@/lib/report';
import { evaluateTargets, parseTargets } from '@/lib/targets';
import { capAtNow, formatDuration, formatHoursPadded, greeting, minutesByCategory } from '@/lib/time';

/**
 * A report of where the time went — logged once a night, read the next morning.
 * It used to lead with the hours *not* logged, which at 3 PM is every hour since
 * waking: true, and no use to someone who logs their whole day before bed.
 */
export default function OverviewScreen() {
  const router = useRouter();
  const now = useNow();
  const [range, setRange] = useState('today');
  // Small phones (iPhone SE) get a shorter chart so the screen still fits.
  const compact = useWindowDimensions().height < 720;
  // The bar being read on the chart — null shows the summary.
  const [selectedBar, setSelectedBar] = useState<number | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [targetsOpen, setTargetsOpen] = useState(false);

  const [weekStartSetting] = useSetting('week_starts_on', '0');
  const weekStartsOn = weekStartSetting === '1' ? 1 : 0;
  const categories = useCategories();
  const trackingStart = useTrackingStart();
  const [lastBackup] = useSetting('last_backup_at', '');
  const needsBackup = backupDue(lastBackup ? new Date(lastBackup) : null, trackingStart, now);

  // Until the night ends (5 AM by default, set in Settings) the day being logged is the
  // one just ending, not the few minutes of the new one — so "Today" becomes "Tonight"
  // and reaches back to yesterday morning.
  const [nightEndsSetting] = useSetting('night_ends', '5');
  const lateNight = now.getHours() < (Number(nightEndsSetting) || 0);
  const [targetsSetting] = useSetting('targets', '[]');
  const targets = useMemo(() => parseTargets(targetsSetting), [targetsSetting]);
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

  // Targets are judged per day: the day being logged, or every tracked day so far.
  const targetDays = useMemo(() => {
    if (range === 'today') return [startOfDay(rangeStart)];
    if (!trackingStart) return [];
    const first = startOfDay(trackingStart > rangeStart ? trackingStart : rangeStart);
    const lastInRange = startOfDay(subDays(rangeEnd, 1));
    const last = startOfDay(now) < lastInRange ? startOfDay(now) : lastInRange;
    return last >= first ? eachDayOfInterval({ start: first, end: last }) : [];
  }, [range, rangeStart, rangeEnd, trackingStart, now]);
  const targetResults = useMemo(() => evaluateTargets(targets, blocks, targetDays), [targets, blocks, targetDays]);
  const targetChecks = targetResults.reduce((sum, r) => sum + r.days.length, 0);
  const targetsMet = targetResults.reduce((sum, r) => sum + r.metDays, 0);

  // The same stretch last time — yesterday, last week or last month, up to the same
  // point — so a week in progress isn't compared against a whole one.
  const { prevStart, prevEnd } = useMemo(() => {
    const back = (d: Date) => (range === 'week' ? subWeeks(d, 1) : range === 'month' ? subMonths(d, 1) : subDays(d, 1));
    const end = back(capAtNow(rangeEnd, now));
    return { prevStart: back(rangeStart), prevEnd: end < rangeStart ? end : rangeStart };
  }, [range, rangeStart, rangeEnd, now]);
  const { blocks: prevBlocks } = useTimeBlocksForRange(prevStart, prevEnd);
  // Only a previous stretch that was tracked from its start is a fair comparison — a
  // half-tracked August makes every September activity look like it went up.
  const comparable = trackingStart !== null && trackingStart <= prevStart;
  const changes = useMemo(() => {
    const previous = comparable
      ? [...minutesByCategory(prevBlocks, prevStart, prevEnd)].map(([categoryId, minutes]) => ({ categoryId, minutes }))
      : [];
    return compareSlices(report.slices, previous);
  }, [comparable, prevBlocks, prevStart, prevEnd, report.slices]);
  const compareLabel = !comparable ? null : range === 'week' ? 'vs last week' : range === 'month' ? 'vs last month' : 'vs yesterday';
  const insight = comparable ? biggestChange(changes) : null;

  const late = useMemo(() => {
    const sleep = new Set(categories.filter((c) => /sleep/i.test(c.name)).map((c) => c.id));
    return awakeLate(blocks, targetDays, now, sleep, Number(nightEndsSetting) || 0);
  }, [blocks, targetDays, now, categories, nightEndsSetting]);

  const nameOf = (id: number) => categories.find((c) => c.id === id)?.name ?? 'Other';

  // Today: 24 hourly bars — when things happened. Week and month: a bar per day, each
  // out of 24 hours, so the empty part of a bar is what went unlogged.
  const columns = useMemo(() => {
    if (range === 'today') return hourlyColumns(blocks, rangeStart, now);
    const days = eachDayOfInterval({ start: rangeStart, end: subDays(rangeEnd, 1) });
    return dailyColumns(blocks, days, now);
  }, [range, blocks, rangeStart, rangeEnd, now]);
  const axis =
    range === 'today'
      ? [
          { index: 0, label: '12a' },
          { index: 6, label: '6a' },
          { index: 12, label: '12p' },
          { index: 18, label: '6p' },
        ]
      : range === 'week'
        ? columns.map((c, i) => ({ index: i, label: format(c.start, 'EEEEE') }))
        : columns.filter((_, i) => i % 7 === 0).map((c) => ({ index: columns.indexOf(c), label: format(c.start, 'd') }));
  const bar = selectedBar !== null ? columns[selectedBar] : null;
  const barLead = bar ? [...bar.segments].sort((a, b) => b.minutes - a.minutes)[0] : null;
  const barCaption = bar
    ? `${
        range === 'today'
          ? `${format(bar.start, 'h a')} – ${format(new Date(bar.start.getTime() + 3600000), 'h a')}`
          : format(bar.start, 'EEE, MMM d')
      } · ${bar.total === 0 ? 'nothing logged' : `mostly ${nameOf(barLead?.categoryId ?? 0)}`}`
    : null;
  const sliceTotal = report.slices.reduce((sum, s) => sum + s.minutes, 0);
  const share = (minutes: number) => (sliceTotal > 0 ? Math.round((minutes / sliceTotal) * 100) : 0);
  const leader = report.slices[0];
  const isToday = range === 'today';

  // The header already carries today's date; the hero says what span it covers.
  const rangeCaption = isToday
    ? lateNight
      ? `${format(rangeStart, 'EEE')} – now`
      : 'Since midnight'
    : range === 'week'
      ? `${format(rangeStart, 'MMM d')} – ${format(subDays(rangeEnd, 1), 'MMM d')}`
      : format(rangeStart, 'MMMM');

  // One line, always: a caption that wraps or truncates is worse than a short one.
  const heroCaption = leader
    ? report.slices.length === 1
      ? `All ${nameOf(leader.categoryId)}`
      : `${nameOf(leader.categoryId)} leads · ${share(leader.minutes)}%`
    : isToday
      ? 'Nothing yet — log your day before bed.'
      : `Nothing logged ${range === 'week' ? 'this week' : 'this month'} yet.`;

  // Left: where tonight's logging picks up (today) or the average day (week/month) —
  // never a repeat of the hero's number. Right: targets, which open on tap; that card
  // replaced a whole row, keeping the screen to five blocks.
  const until = report.loggedUntil;
  const leftCard = isToday
    ? { label: 'Logged until', value: until ? format(until, isSameDay(until, now) ? 'h:mm a' : 'EEE h:mm a') : '—' }
    : {
        label: 'Daily average',
        value: report.trackedDays > 0 ? formatHoursPadded(report.logged / report.trackedDays) : '—',
      };
  const rightCard =
    targets.length === 0
      ? { label: 'Daily targets', value: 'Add one' }
      : { label: 'Targets met', value: targetChecks === 0 ? '—' : `${targetsMet} of ${targetChecks}` };

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
          <RangePills
            options={ranges}
            value={range}
            onChange={(next) => {
              setRange(next);
              setSelectedBar(null);
            }}
          />
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
            style={[
              styles.heroValue,
              { fontSize: fitFontSize(formatHoursPadded(bar ? bar.total : report.logged), 42, 8) },
            ]}
            numberOfLines={1}
          >
            {formatHoursPadded(bar ? bar.total : report.logged)}
          </Text>
          <Text style={styles.heroSub} numberOfLines={1}>
            {barCaption ?? heroCaption}
          </Text>

          <View style={styles.bar}>
            <ActivityChart
              columns={columns}
              categories={categories}
              axis={axis}
              average={range !== 'today' && report.trackedDays > 0 ? report.logged / report.trackedDays : null}
              selected={selectedBar}
              onSelect={setSelectedBar}
              animateKey={`${range}|${rangeStart.toISOString()}`}
              height={compact ? 54 : 70}
            />
          </View>
        </View>

        <View style={styles.statRow}>
          <StatCard label={leftCard.label} value={leftCard.value} tone="ink" />
          <StatCard label={rightCard.label} value={rightCard.value} tone="pop" onPress={() => setTargetsOpen(true)} />
        </View>

        <View style={styles.disclosure}>
          <DisclosureRow
            icon={<TimelineIcon color={colors.rose} />}
            title="Where it went"
            hint={
              report.slices.length === 0
                ? 'Nothing logged yet'
                : insight
                  ? `${nameOf(insight.categoryId)} ${insight.delta > 0 ? '▲' : '▼'} ${formatDuration(Math.abs(insight.delta))} ${compareLabel}`
                  : late.minutes >= 30 && late.slices[0]
                    ? `${formatDuration(late.minutes)} awake after 11 PM`
                    : `${report.slices.length} ${report.slices.length === 1 ? 'activity' : 'activities'} · tap to see`
            }
            onPress={() => setSheetOpen(true)}
          />
        </View>

        <View style={styles.action}>
          <PrimaryButton
            label={isToday && !leader ? 'Log your day' : 'Add time'}
            onPress={() =>
              isToday && !leader
                ? router.push({ pathname: '/log', params: { walk: '1', n: String(Date.now()) } })
                : router.push('/log')
            }
            icon={<PlusIcon color={colors.surface} />}
          />
        </View>
      </View>

      <WhereItWentSheet
        visible={sheetOpen}
        subtitle={rangeCaption}
        changes={changes}
        compareLabel={compareLabel}
        late={late}
        unloggedPast={isToday || !trackingStart ? null : report.unloggedPast}
        categories={categories}
        onClose={() => setSheetOpen(false)}
      />

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
        onOpenTargets={() => {
          setSettingsOpen(false);
          setTargetsOpen(true);
        }}
      />
      <TargetsSheet
        visible={targetsOpen}
        categories={categories}
        results={targetResults}
        onClose={() => setTargetsOpen(false)}
      />
      <ReminderSheet visible={reminderOpen} onClose={() => setReminderOpen(false)} />
      <CategoriesSheet visible={categoriesOpen} onClose={() => setCategoriesOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ground },
  content: { flex: 1, paddingTop: 26, paddingHorizontal: spacing.gutter },

  pills: { marginTop: 16 },
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

  hero: { backgroundColor: colors.rose, borderRadius: 26, padding: 18, paddingBottom: 12, marginTop: 16 },
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
    fontSize: 42,
    letterSpacing: -1.8,
    color: colors.surface,
    marginTop: 12,
    fontVariant: ['tabular-nums'],
  },
  bar: { marginTop: 12 },
  heroSub: { fontFamily: font.regular, fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 4, lineHeight: 17 },

  statRow: { flexDirection: 'row', gap: 10, marginTop: 11 },
  disclosure: { marginTop: 11 },
  action: { marginTop: 'auto', marginBottom: 20 },
});
