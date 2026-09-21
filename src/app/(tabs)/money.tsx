import {
  addDays,
  addMonths,
  addYears,
  eachDayOfInterval,
  eachMonthOfInterval,
  format,
  startOfMonth,
  startOfYear,
  subDays,
  subMonths,
} from 'date-fns';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AddTransactionSheet } from '@/components/AddTransactionSheet';
import { Sparkline } from '@/components/Sparkline';
import { MoneyIcon, PlusIcon } from '@/components/icons';
import { DisclosureRow, PrimaryButton, RangePills, ScreenHeader, Sheet, StatCard } from '@/components/ui';
import { moneyColor } from '@/constants/money';
import { useSetting } from '@/hooks/useSettings';
import { useTransactionsForRange } from '@/hooks/useTransactions';
import { colors, font, spacing, type } from '@/lib/colors';
import { formatCurrency, formatSigned } from '@/lib/currency';
import { cumulative, netOf, sumByType, transactionLabel, withinRange } from '@/lib/money';

const RANGES = [
  { key: 'month', label: 'This month' },
  { key: 'last', label: 'Last month' },
  { key: 'year', label: 'This year' },
];

export default function MoneyScreen() {
  const now = useMemo(() => new Date(), []);
  const [range, setRange] = useState('month');
  const [listOpen, setListOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [tab, setTab] = useState<'expense' | 'income'>('expense');
  const [currency] = useSetting('currency', 'PHP');

  const { rangeStart, rangeEnd } = useMemo(() => {
    if (range === 'last') {
      const s = startOfMonth(subMonths(now, 1));
      return { rangeStart: s, rangeEnd: addMonths(s, 1) };
    }
    if (range === 'year') {
      const s = startOfYear(now);
      return { rangeStart: s, rangeEnd: addYears(s, 1) };
    }
    const s = startOfMonth(now);
    return { rangeStart: s, rangeEnd: addMonths(s, 1) };
  }, [range, now]);

  const { transactions, add, remove } = useTransactionsForRange(rangeStart, rangeEnd);

  const spent = sumByType(transactions, 'expense');
  const earned = sumByType(transactions, 'income');
  const net = earned - spent;

  // Running balance across the range — one point per day, or per month for a year.
  const trend = useMemo(() => {
    const byMonth = range === 'year';
    const end = subDays(rangeEnd, 1);
    const buckets = byMonth
      ? eachMonthOfInterval({ start: rangeStart, end })
      : eachDayOfInterval({ start: rangeStart, end });
    const perBucket = buckets.map((bucketStart) => {
      const bucketEnd = byMonth ? addMonths(bucketStart, 1) : addDays(bucketStart, 1);
      return netOf(withinRange(transactions, bucketStart, bucketEnd));
    });
    return cumulative(perBucket);
  }, [transactions, rangeStart, rangeEnd, range]);

  const rows = transactions.filter((t) => t.type === tab);
  const rangeLabel = RANGES.find((r) => r.key === range)?.label ?? 'This month';
  const periodLabel =
    range === 'year' ? format(rangeStart, 'yyyy') : format(rangeStart, 'MMMM yyyy');

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <ScreenHeader title="Money" subtitle={periodLabel} />

        <View style={styles.pills}>
          <RangePills options={RANGES} value={range} onChange={setRange} />
        </View>

        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.heroLabelRow}>
              <View style={styles.heroChip}>
                <MoneyIcon color={colors.surface} size={14} strokeWidth={2.4} />
              </View>
              <Text style={styles.heroLabel}>Net</Text>
            </View>
            <Text style={styles.heroRange}>{range === 'year' ? 'By month' : 'Running balance'}</Text>
          </View>

          <Text style={styles.heroValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
            {formatSigned(net, currency)}
          </Text>
          <Text style={styles.heroSub} numberOfLines={1}>
            {formatCurrency(spent, currency)} out · {formatCurrency(earned, currency)} in
          </Text>

          {trend.length > 1 ? (
            <View style={styles.spark}>
              <Sparkline values={trend} label={transactions.length === 0 ? '—' : formatCurrency(net, currency)} />
            </View>
          ) : (
            <Text style={styles.heroEmpty}>Nothing recorded {rangeLabel.toLowerCase()} yet.</Text>
          )}
        </View>

        <View style={styles.statRow}>
          <StatCard label="Spent" value={formatCurrency(spent, currency)} tone="ink" />
          <StatCard label="Earned" value={formatCurrency(earned, currency)} tone="pop" />
        </View>

        <View style={styles.disclosure}>
          <DisclosureRow
            icon={<MoneyIcon color={colors.rose} size={16} />}
            title="Transactions"
            hint={
              transactions.length === 0
                ? 'Nothing recorded yet'
                : `${transactions.length} recorded · tap to review`
            }
            onPress={() => setListOpen(true)}
          />
        </View>

        <View style={styles.action}>
          <PrimaryButton
            label="Add transaction"
            onPress={() => setAddOpen(true)}
            icon={<PlusIcon color={colors.surface} />}
          />
        </View>
      </View>

      <Sheet visible={listOpen} title="Transactions" subtitle={periodLabel} onClose={() => setListOpen(false)}>
        <View style={styles.segment}>
          {(['expense', 'income'] as const).map((t) => {
            const active = t === tab;
            return (
              <Pressable
                key={t}
                style={[styles.segmentItem, active && styles.segmentItemActive]}
                onPress={() => setTab(t)}
              >
                <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>
                  {t === 'expense' ? 'Expenses' : 'Income'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {rows.length === 0 ? (
          <Text style={styles.empty}>No {tab === 'expense' ? 'expenses' : 'income'} in this period.</Text>
        ) : (
          <ScrollView style={styles.listScroll}>
            {rows.map((t) => {
              const label = transactionLabel(t);
              return (
                <Pressable key={t.id} style={styles.row} onLongPress={() => remove(t.id)}>
                  <View style={[styles.rowChip, { backgroundColor: `${moneyColor(label)}22` }]}>
                    <View style={[styles.dot, { backgroundColor: moneyColor(label) }]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowLabel}>{label}</Text>
                    <Text style={styles.rowDate}>{format(new Date(t.date), 'MMM d')}</Text>
                  </View>
                  <Text
                    style={[styles.rowAmount, t.type === 'income' && styles.rowAmountIn]}
                    numberOfLines={1}
                  >
                    {formatSigned(t.type === 'income' ? t.amount : -t.amount, currency)}
                  </Text>
                </Pressable>
              );
            })}
            <Text style={styles.hint}>Long-press a row to delete it.</Text>
          </ScrollView>
        )}
      </Sheet>

      <AddTransactionSheet
        visible={addOpen}
        currency={currency}
        onClose={() => setAddOpen(false)}
        onSave={(input) => add(input)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ground },
  content: { flex: 1, paddingTop: 26, paddingHorizontal: spacing.gutter },

  pills: { marginTop: 18 },

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
    fontSize: 44,
    letterSpacing: -2,
    color: colors.surface,
    marginTop: 16,
    fontVariant: ['tabular-nums'],
  },
  heroSub: { fontFamily: font.regular, fontSize: 12, color: 'rgba(255,255,255,0.78)', marginTop: 4 },
  heroEmpty: { fontFamily: font.regular, fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 18 },
  spark: { marginTop: 12 },

  statRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  disclosure: { marginTop: 18 },
  action: { marginTop: 'auto', marginBottom: 20 },

  segment: { flexDirection: 'row', backgroundColor: colors.ground, borderRadius: 16, padding: 3, gap: 3, marginTop: 16 },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 13 },
  segmentItemActive: { backgroundColor: colors.rose },
  segmentLabel: { fontFamily: font.semibold, fontSize: 12.5, color: colors.inkSoft },
  segmentLabelActive: { color: colors.surface },

  listScroll: { marginTop: 8, maxHeight: 320 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 11 },
  rowChip: { width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 9, height: 9, borderRadius: 5 },
  rowLabel: { fontFamily: font.semibold, fontSize: 13, color: colors.ink },
  rowDate: { fontFamily: font.regular, fontSize: 11, color: colors.inkSoft, marginTop: 1 },
  rowAmount: { fontFamily: font.bold, fontSize: 13.5, color: colors.ink, fontVariant: ['tabular-nums'] },
  rowAmountIn: { color: '#256247' },

  empty: { fontFamily: font.regular, fontSize: 13, color: colors.inkSoft, paddingVertical: 24 },
  hint: { fontFamily: font.regular, fontSize: 11, color: colors.inkFaint, paddingVertical: 14 },
});
