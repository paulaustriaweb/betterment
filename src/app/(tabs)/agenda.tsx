import { addDays, differenceInMinutes, format, isSameDay, startOfDay, startOfWeek } from 'date-fns';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ScreenHeader } from '@/components/ui';
import { useCategories } from '@/hooks/useCategories';
import { useTimeBlocksForDay } from '@/hooks/useTimeBlocks';
import { colors, font, spacing, tintFor } from '@/lib/colors';
import { findGaps, formatDuration } from '@/lib/time';

const HOUR_HEIGHT = 62;
const GUTTER = 54;
const DAY_HEIGHT = HOUR_HEIGHT * 24;
/** Below this, a block is too short to hold two lines of text. */
const COMPACT_BLOCK = 44;

export default function AgendaScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const now = useMemo(() => new Date(), []);
  const [selected, setSelected] = useState(() => startOfDay(now));

  const categories = useCategories();
  const blocks = useTimeBlocksForDay(selected).blocks;
  const gaps = useMemo(() => findGaps(blocks, selected), [blocks, selected]);

  const isToday = isSameDay(selected, now);
  const nowMinutes = differenceInMinutes(now, startOfDay(now));

  const week = useMemo(() => {
    const start = startOfWeek(selected);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [selected]);

  useEffect(() => {
    // open on the current hour rather than midnight — nobody logs at 3am
    const target = isToday ? (nowMinutes / 60) * HOUR_HEIGHT - 180 : 8 * HOUR_HEIGHT;
    scrollRef.current?.scrollTo({ y: Math.max(0, target), animated: false });
  }, [isToday, nowMinutes, selected]);

  const totalGapMinutes = gaps.reduce((sum, g) => sum + (g.end - g.start), 0);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <ScreenHeader title="Your day" subtitle={format(selected, 'MMMM yyyy')} />

        <View style={styles.weekStrip}>
          {week.map((d) => {
            const active = isSameDay(d, selected);
            return (
              <Pressable key={d.toISOString()} style={styles.weekDay} onPress={() => setSelected(startOfDay(d))}>
                <Text style={styles.weekDow}>{format(d, 'EEEEE')}</Text>
                <View style={[styles.weekNum, active && styles.weekNumActive]}>
                  <Text style={[styles.weekNumText, active && styles.weekNumTextActive]}>{format(d, 'd')}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.summary}>
          <Text style={styles.summaryLeft}>{isToday ? 'Today' : format(selected, 'EEEE, MMM d')}</Text>
          <Text style={styles.summaryRight}>{formatDuration(totalGapMinutes)} not logged</Text>
        </View>
      </View>

      <ScrollView ref={scrollRef} style={styles.scroll} contentContainerStyle={styles.timeline}>
        {Array.from({ length: 24 }, (_, h) => (
          <View key={h} style={[styles.hourRow, { top: h * HOUR_HEIGHT }]}>
            <Text style={styles.hourLabel}>{format(new Date(2026, 0, 1, h), 'h a')}</Text>
            <View style={styles.hourLine} />
          </View>
        ))}

        {gaps.map((gap) => {
          const height = ((gap.end - gap.start) / 60) * HOUR_HEIGHT;
          const minutes = gap.end - gap.start;
          return (
            <Pressable
              key={`gap-${gap.start}`}
              style={[styles.gap, { top: (gap.start / 60) * HOUR_HEIGHT, height: Math.max(30, height - 4) }]}
              onPress={() =>
                router.push({
                  pathname: '/log',
                  params: { start: String(gap.start), dur: String(Math.min(minutes, 240)) },
                })
              }
            >
              <Text style={styles.gapLabel}>{formatDuration(minutes)} not logged</Text>
              {height > COMPACT_BLOCK ? <Text style={styles.gapHint}>Tap to log</Text> : null}
            </Pressable>
          );
        })}

        {blocks.map((b) => {
          const start = differenceInMinutes(new Date(b.startTime), selected);
          const end = differenceInMinutes(new Date(b.endTime), selected);
          const height = ((end - start) / 60) * HOUR_HEIGHT;
          const category = categories.find((c) => c.id === b.categoryId);
          const tint = tintFor(category?.color ?? '');
          return (
            <Pressable
              key={b.id}
              style={[
                styles.block,
                { top: (start / 60) * HOUR_HEIGHT, height: Math.max(28, height - 4), backgroundColor: tint.fill },
              ]}
              onPress={() => router.push('/log')}
            >
              <Text style={[styles.blockTitle, { color: tint.text }]} numberOfLines={1}>
                {category?.name ?? 'Unknown'}
              </Text>
              {height > COMPACT_BLOCK ? (
                <Text style={[styles.blockSub, { color: tint.text }]} numberOfLines={1}>
                  {b.note ?? formatDuration(end - start)}
                </Text>
              ) : null}
            </Pressable>
          );
        })}

        {isToday ? (
          <View style={[styles.nowRow, { top: (nowMinutes / 60) * HOUR_HEIGHT }]}>
            <Text style={styles.nowLabel}>{format(now, 'h:mm')}</Text>
            <View style={styles.nowDot} />
            <View style={styles.nowLine} />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ground },
  header: { paddingTop: 26, paddingHorizontal: spacing.gutter },

  weekStrip: { flexDirection: 'row', gap: 4, marginTop: 15 },
  weekDay: { flex: 1, alignItems: 'center', gap: 7, paddingVertical: 4 },
  weekDow: { fontFamily: font.regular, fontSize: 10.5, color: colors.inkFaint },
  weekNum: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  weekNumActive: { backgroundColor: colors.rose },
  weekNumText: { fontFamily: font.medium, fontSize: 13, color: colors.ink },
  weekNumTextActive: { fontFamily: font.bold, color: colors.surface },

  summary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 16 },
  summaryLeft: { fontFamily: font.regular, fontSize: 12.5, color: colors.inkSoft },
  summaryRight: { fontFamily: font.semibold, fontSize: 12.5, color: colors.rose },

  scroll: { flex: 1, marginTop: 14 },
  timeline: { height: DAY_HEIGHT, paddingHorizontal: spacing.gutter },

  hourRow: { position: 'absolute', left: spacing.gutter, right: spacing.gutter },
  hourLabel: { position: 'absolute', left: 0, top: -6, fontFamily: font.regular, fontSize: 10, color: colors.inkFaint },
  hourLine: { position: 'absolute', left: GUTTER - 6, right: 0, height: 1, backgroundColor: '#F2DDE4' },

  gap: {
    position: 'absolute',
    left: spacing.gutter + GUTTER,
    right: spacing.gutter,
    borderRadius: 13,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#EBBACA',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  gapLabel: { fontFamily: font.semibold, fontSize: 12, color: colors.rose },
  gapHint: { fontFamily: font.regular, fontSize: 10.5, color: '#A8848F' },

  block: {
    position: 'absolute',
    left: spacing.gutter + GUTTER,
    right: spacing.gutter,
    borderRadius: 13,
    paddingVertical: 9,
    paddingHorizontal: 12,
    overflow: 'hidden',
  },
  blockTitle: { fontFamily: font.semibold, fontSize: 12.5 },
  blockSub: { fontFamily: font.regular, fontSize: 11, marginTop: 1, opacity: 0.75 },

  nowRow: { position: 'absolute', left: spacing.gutter, right: spacing.gutter, flexDirection: 'row', alignItems: 'center' },
  nowLabel: { width: 34, fontFamily: font.bold, fontSize: 10, color: colors.rose },
  nowDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: colors.rose,
    borderWidth: 2,
    borderColor: colors.ground,
  },
  nowLine: { flex: 1, height: 2, borderRadius: 1, backgroundColor: colors.rose },
});
