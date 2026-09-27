import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, font } from '@/lib/colors';
import type { Change, LateNight } from '@/lib/insights';
import { formatDuration } from '@/lib/time';
import type { Category } from '@/lib/types';
import { Sheet } from './ui';

interface Props {
  visible: boolean;
  subtitle: string;
  changes: Change[];
  /** "vs last week" — null when there's nothing to compare against yet. */
  compareLabel: string | null;
  late: LateNight;
  /** Unlogged time on finished days; shown for week and month only. */
  unloggedPast: number | null;
  categories: Category[];
  onClose: () => void;
}

function deltaText(c: Change): string {
  if (c.before === 0) return 'new';
  if (c.delta === 0) return 'same';
  return `${c.delta > 0 ? '+' : '−'}${formatDuration(Math.abs(c.delta))}`;
}

/**
 * The full breakdown behind Overview's one-line insight: each activity's share, how
 * it moved against the same stretch last time, and how much of it happened after 11.
 */
export function WhereItWentSheet({
  visible,
  subtitle,
  changes,
  compareLabel,
  late,
  unloggedPast,
  categories,
  onClose,
}: Props) {
  const nameOf = (id: number) => categories.find((c) => c.id === id)?.name ?? 'Other';
  const colorOf = (id: number) => categories.find((c) => c.id === id)?.color ?? colors.inkFaint;
  const current = changes.filter((c) => c.now > 0);
  const stopped = changes.filter((c) => c.now === 0 && c.before > 0);
  const total = current.reduce((sum, c) => sum + c.now, 0);
  const share = (m: number) => (total > 0 ? Math.round((m / total) * 100) : 0);
  const lead = late.slices[0];

  return (
    <Sheet visible={visible} title="Where it went" subtitle={subtitle} onClose={onClose}>
      {current.length === 0 ? (
        <Text style={styles.empty}>Nothing logged here yet.</Text>
      ) : (
        <ScrollView style={styles.scroll}>
          {compareLabel ? <Text style={styles.compare}>Changes are {compareLabel}, at the same point.</Text> : null}
          {current.map((c) => {
            const pct = share(c.now);
            return (
              <View key={c.categoryId} style={styles.row}>
                <View style={styles.top}>
                  <View style={[styles.dot, { backgroundColor: colorOf(c.categoryId) }]} />
                  <Text style={styles.label}>{nameOf(c.categoryId)}</Text>
                  <Text style={styles.value}>{formatDuration(c.now)}</Text>
                  <Text style={styles.pct}>{pct}%</Text>
                </View>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${pct}%`, backgroundColor: colorOf(c.categoryId) }]} />
                </View>
                {compareLabel ? <Text style={styles.delta}>{deltaText(c)}</Text> : null}
              </View>
            );
          })}

          {compareLabel && stopped.length > 0 ? (
            <Text style={styles.footnote}>
              Not this time: {stopped.map((c) => `${nameOf(c.categoryId)} (${formatDuration(c.before)} before)`).join(', ')}.
            </Text>
          ) : null}

          {late.minutes > 0 && lead ? (
            <View style={styles.late} accessible accessibilityLabel={`Awake after 11 PM: ${formatDuration(late.minutes)}, mostly ${nameOf(lead.categoryId)}`}>
              <Text style={styles.lateLabel}>Awake after 11 PM</Text>
              <Text style={styles.lateValue}>{formatDuration(late.minutes)}</Text>
              <Text style={styles.lateSub}>
                Mostly {nameOf(lead.categoryId)} · {formatDuration(lead.minutes)}
              </Text>
            </View>
          ) : null}

          {unloggedPast !== null && unloggedPast > 0 ? (
            <Text style={styles.footnote}>
              {formatDuration(unloggedPast)} went unlogged on days that are over. Tap a gap on Day to fill it in.
            </Text>
          ) : null}
        </ScrollView>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  scroll: { marginTop: 14, maxHeight: 420 },
  empty: { fontFamily: font.regular, fontSize: 13, color: colors.inkSoft, paddingVertical: 20 },
  compare: { fontFamily: font.regular, fontSize: 11.5, color: colors.inkSoft, marginBottom: 12 },
  row: { marginBottom: 14 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  label: { flex: 1, fontFamily: font.medium, fontSize: 13, color: colors.ink },
  value: { fontFamily: font.bold, fontSize: 13, color: colors.ink, fontVariant: ['tabular-nums'] },
  pct: {
    width: 38,
    textAlign: 'right',
    fontFamily: font.regular,
    fontSize: 11.5,
    color: colors.inkSoft,
    fontVariant: ['tabular-nums'],
  },
  track: { height: 6, borderRadius: 3, backgroundColor: '#F6EDF0', marginTop: 7, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  delta: {
    alignSelf: 'flex-end',
    fontFamily: font.semibold,
    fontSize: 11,
    color: colors.inkSoft,
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  late: { backgroundColor: colors.ink, borderRadius: 18, padding: 16, marginTop: 6, marginBottom: 10 },
  lateLabel: { fontFamily: font.semibold, fontSize: 11.5, color: 'rgba(255,255,255,0.8)' },
  lateValue: {
    fontFamily: font.bold,
    fontSize: 25,
    letterSpacing: -0.9,
    color: colors.surface,
    marginTop: 6,
    fontVariant: ['tabular-nums'],
  },
  lateSub: { fontFamily: font.regular, fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 3 },
  footnote: { fontFamily: font.regular, fontSize: 11.5, color: colors.inkSoft, lineHeight: 17, marginTop: 4, marginBottom: 8 },
});
