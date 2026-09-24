import { format, isToday, isYesterday, startOfDay } from 'date-fns';
import * as haptics from '@/lib/haptics';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { EXPENSE_CATEGORIES, INCOME_SOURCES } from '@/constants/money';
import { useSubmitGuard } from '@/hooks/useSubmitGuard';
import type { TransactionInput } from '@/db/transactions';
import { colors, font, radius } from '@/lib/colors';
import { formatCurrency } from '@/lib/currency';
import { fitFontSize } from '@/lib/fit';
import { onDay, transactionLabel } from '@/lib/money';
import type { Transaction } from '@/lib/types';
import { AmountPad } from './AmountPad';
import { Banner } from './Banner';
import { AgendaIcon, NoteIcon } from './icons';
import { MonthCalendar } from './MonthCalendar';
import { PrimaryButton, Sheet } from './ui';

interface Props {
  visible: boolean;
  currency: string;
  /** Set to edit an existing row; null adds a new one. */
  editing: Transaction | null;
  weekStartsOn: 0 | 1;
  onClose: () => void;
  /** Rejects on a failed write; the sheet stays open and says so. */
  onSubmit: (input: TransactionInput, id?: number) => Promise<void>;
}

function dayLabel(day: Date): string {
  if (isToday(day)) return 'Today';
  if (isYesterday(day)) return 'Yesterday';
  return format(day, 'EEE, MMM d');
}

export function AddTransactionSheet({ visible, currency, editing, weekStartsOn, onClose, onSubmit }: Props) {
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('0');
  const [label, setLabel] = useState<string | null>(null);
  const [day, setDay] = useState(() => startOfDay(new Date()));
  const [note, setNote] = useState('');
  // Date and note take the keypad's place while open, so the sheet never grows
  // past the screen — and both start collapsed, per the density rules.
  const [panel, setPanel] = useState<'pad' | 'date' | 'note'>('pad');
  const [failed, setFailed] = useState(false);
  const submit = useSubmitGuard();

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
      setDay(startOfDay(editing ? new Date(editing.date) : new Date()));
      setNote(editing?.note ?? '');
      setPanel('pad');
      setFailed(false);
    }
  }

  const options = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_SOURCES;
  const parsed = Number(amount) || 0;
  const canSave = parsed > 0 && label !== null;

  function switchType(next: 'expense' | 'income') {
    haptics.tick();
    setType(next);
    setLabel(null);
  }

  function save() {
    if (!canSave) return;
    const input: TransactionInput = {
      type,
      amount: parsed,
      category: type === 'expense' ? label : null,
      source: type === 'income' ? label : null,
      note: note.trim() || null,
      date: onDay(day, editing ? new Date(editing.date) : new Date()).toISOString(),
    };
    const id = editing?.id;
    submit(async () => {
      try {
        await onSubmit(input, id);
        setFailed(false);
        onClose();
      } catch (error) {
        // Without this the sheet just sat there doing nothing on a failed write.
        console.error('transaction save failed', error);
        setFailed(true);
      }
    });
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
                haptics.tick();
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

      <View style={styles.metaRow}>
        <Pressable
          style={[styles.metaPill, panel === 'date' && styles.metaPillOpen]}
          onPress={() => setPanel(panel === 'date' ? 'pad' : 'date')}
          accessibilityRole="button"
          accessibilityState={{ expanded: panel === 'date' }}
          accessibilityLabel={`Date: ${format(day, 'EEEE, MMMM d')}. Tap to change.`}
        >
          <AgendaIcon color={colors.rose} size={14} />
          <Text style={styles.metaLabel} numberOfLines={1}>
            {dayLabel(day)}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.metaPill, styles.metaPillWide, panel === 'note' && styles.metaPillOpen]}
          onPress={() => setPanel(panel === 'note' ? 'pad' : 'note')}
          accessibilityRole="button"
          accessibilityState={{ expanded: panel === 'note' }}
          accessibilityLabel={note.trim() ? `Note: ${note.trim()}. Tap to edit.` : 'Add a note'}
        >
          <NoteIcon color={colors.rose} size={14} />
          <Text style={[styles.metaLabel, !note.trim() && styles.metaPlaceholder]} numberOfLines={1}>
            {note.trim() || 'Add a note'}
          </Text>
        </Pressable>
      </View>

      {panel === 'date' ? (
        <MonthCalendar
          value={day}
          maxDate={new Date()}
          weekStartsOn={weekStartsOn}
          onChange={(picked) => {
            setDay(picked);
            setPanel('pad');
          }}
        />
      ) : panel === 'note' ? (
        <TextInput
          style={styles.noteInput}
          placeholder="What was it for?"
          placeholderTextColor={colors.inkFaint}
          value={note}
          onChangeText={setNote}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={() => setPanel('pad')}
        />
      ) : (
        <AmountPad value={amount} onChange={setAmount} />
      )}

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

  metaRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: colors.ground,
    borderRadius: radius.chip,
    paddingVertical: 9,
    paddingHorizontal: 13,
  },
  metaPillWide: { flex: 1 },
  metaPillOpen: { backgroundColor: colors.roseTint },
  metaLabel: { flexShrink: 1, fontFamily: font.semibold, fontSize: 12.5, color: colors.ink },
  metaPlaceholder: { fontFamily: font.medium, color: colors.inkSoft },
  noteInput: {
    fontFamily: font.medium,
    fontSize: 15,
    color: colors.ink,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    marginBottom: 12,
  },

  banner: { marginTop: 4 },
  disabled: { opacity: 0.4 },
});
