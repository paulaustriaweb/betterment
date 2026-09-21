import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EXPENSE_CATEGORIES, INCOME_SOURCES } from '@/constants/money';
import type { TransactionInput } from '@/db/transactions';
import { colors, font, radius } from '@/lib/colors';
import { formatCurrency } from '@/lib/currency';
import { AmountPad } from './AmountPad';
import { PrimaryButton, Sheet } from './ui';

interface Props {
  visible: boolean;
  currency: string;
  onClose: () => void;
  onSave: (input: TransactionInput) => void;
}

export function AddTransactionSheet({ visible, currency, onClose, onSave }: Props) {
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('0');
  const [label, setLabel] = useState<string | null>(null);

  const options = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_SOURCES;
  const parsed = Number(amount) || 0;
  const canSave = parsed > 0 && label !== null;

  function switchType(next: 'expense' | 'income') {
    Haptics.selectionAsync();
    setType(next);
    setLabel(null);
  }

  function reset() {
    setAmount('0');
    setLabel(null);
    setType('expense');
  }

  function save() {
    if (!canSave) return;
    onSave({
      type,
      amount: parsed,
      category: type === 'expense' ? label : null,
      source: type === 'income' ? label : null,
      note: null,
      date: new Date().toISOString(),
    });
    reset();
    onClose();
  }

  return (
    <Sheet
      visible={visible}
      title="Add transaction"
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
            >
              <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>
                {t === 'expense' ? 'Expense' : 'Income'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.amount, { color: parsed > 0 ? colors.ink : colors.inkFaint }]}>
        {type === 'income' ? '+' : ''}
        {formatCurrency(parsed, currency)}
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {options.map((o) => {
          const active = o.label === label;
          return (
            <Pressable
              key={o.label}
              style={[styles.chip, { backgroundColor: active ? colors.ink : colors.ground }]}
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

  disabled: { opacity: 0.4 },
});
