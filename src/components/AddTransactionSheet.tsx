import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EXPENSE_CATEGORIES, INCOME_SOURCES } from '@/constants/money';
import type { TransactionInput } from '@/db/transactions';
import { colors, font, radius } from '@/lib/colors';
import { formatCurrency } from '@/lib/currency';
import { fitFontSize } from '@/lib/fit';
import { transactionLabel } from '@/lib/money';
import type { Transaction } from '@/lib/types';
import { AmountPad } from './AmountPad';
import { Banner } from './Banner';
import { PrimaryButton, Sheet } from './ui';

interface Props {
  visible: boolean;
  currency: string;
  /** Set to edit an existing row; null adds a new one. */
  editing: Transaction | null;
  onClose: () => void;
  onSubmit: (input: TransactionInput, id?: number) => void;
}

export function AddTransactionSheet({ visible, currency, editing, onClose, onSubmit }: Props) {
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('0');
  const [label, setLabel] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  // The sheet stays mounted, so load during render rather than syncing in an effect.
  // Keyed on `visible` as well as the row: opening the same row twice, or opening a
  // blank one after abandoning a half-typed amount, has to start clean — otherwise
  // a stale figure is sitting there waiting to be saved as if it were fresh.
  const signature = `${visible}|${editing?.id ?? ''}`;
  const [loaded, setLoaded] = useState(signature);
  if (signature !== loaded) {
    setLoaded(signature);
    if (visible) {
      setType(editing?.type ?? 'expense');
      setAmount(editing ? String(editing.amount) : '0');
      setLabel(editing ? transactionLabel(editing) : null);
    }
  }

  const options = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_SOURCES;
  const parsed = Number(amount) || 0;
  const canSave = parsed > 0 && label !== null;

  function switchType(next: 'expense' | 'income') {
    Haptics.selectionAsync();
    setType(next);
    setLabel(null);
  }

  function save() {
    if (!canSave) return;
    try {
      onSubmit(
        {
          type,
          amount: parsed,
          category: type === 'expense' ? label : null,
          source: type === 'income' ? label : null,
          note: editing?.note ?? null,
          date: editing?.date ?? new Date().toISOString(),
        },
        editing?.id
      );
      setFailed(false);
      onClose();
    } catch (error) {
      // Without this the sheet just sat there doing nothing on a failed write.
      console.error('transaction save failed', error);
      setFailed(true);
    }
  }

  return (
    <Sheet
      visible={visible}
      title={editing ? 'Edit transaction' : 'Add transaction'}
      subtitle={type === 'expense' ? 'Money out' : 'Money in'}
      onClose={onClose}
    >
      <View style={styles.segment}>
        {(['expense', 'income'] as const).map((t) => {
          const active = t === type;
          return (
            <Pressable
              key={t}
              style={[styles.segmentItem, active && styles.segmentItemActive]}
              onPress={() => switchType(t)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={t === 'expense' ? 'Expense' : 'Income'}
            >
              <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>
                {t === 'expense' ? 'Expense' : 'Income'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text
        style={[
          styles.amount,
          {
            color: parsed > 0 ? colors.ink : colors.inkFaint,
            fontSize: fitFontSize(formatCurrency(parsed, currency), 40, 9),
          },
        ]}
        numberOfLines={1}
      >
        {type === 'income' && parsed > 0 ? '+' : ''}
        {formatCurrency(parsed, currency)}
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {options.map((o) => {
          const active = o.label === label;
          return (
            <Pressable
              key={o.label}
              style={[styles.chip, { backgroundColor: active ? colors.ink : colors.ground }]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={o.label}
              onPress={() => {
                Haptics.selectionAsync();
                setLabel(o.label);
              }}
            >
              <View style={[styles.dot, { backgroundColor: active ? colors.rosePop : o.color }]} />
              <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {failed ? (
        <View style={styles.banner}>
          <Banner message="Couldn't save that — check it's still right, then try again." />
        </View>
      ) : null}

      <AmountPad value={amount} onChange={setAmount} />

      <View style={canSave ? undefined : styles.disabled} pointerEvents={canSave ? 'auto' : 'none'}>
        <PrimaryButton label={label === null ? 'Pick a category' : 'Save'} onPress={save} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  segment: { flexDirection: 'row', backgroundColor: colors.ground, borderRadius: 16, padding: 3, gap: 3, marginTop: 18 },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 13 },
  segmentItemActive: { backgroundColor: colors.rose },
  segmentLabel: { fontFamily: font.semibold, fontSize: 12.5, color: colors.inkSoft },
  segmentLabelActive: { color: colors.surface },

  amount: {
    fontFamily: font.bold,
    fontSize: 40,
    letterSpacing: -1.8,
    marginTop: 18,
    fontVariant: ['tabular-nums'],
  },

  chipRow: { gap: 8, paddingVertical: 14, alignItems: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: radius.chip, paddingVertical: 10, paddingHorizontal: 15 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  chipLabel: { fontFamily: font.medium, fontSize: 12.5, color: colors.ink },
  chipLabelActive: { fontFamily: font.semibold, color: colors.surface },

  banner: { marginTop: 4 },
  disabled: { opacity: 0.4 },
});
