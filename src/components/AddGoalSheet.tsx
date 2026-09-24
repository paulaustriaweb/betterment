import { addDays, addMonths, format, isSameDay, startOfDay } from 'date-fns';
import * as haptics from '@/lib/haptics';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useNow } from '@/hooks/useNow';
import { useSubmitGuard } from '@/hooks/useSubmitGuard';
import { colors, font, radius } from '@/lib/colors';
import type { Goal } from '@/lib/types';
import { Banner } from './Banner';
import { MonthCalendar } from './MonthCalendar';
import { PrimaryButton, Sheet } from './ui';

interface Props {
  visible: boolean;
  /** Set to edit an existing goal; null adds a new one. */
  editing: Goal | null;
  weekStartsOn: 0 | 1;
  onClose: () => void;
  /** Rejects on a failed write; the sheet stays open and says so. */
  onSave: (title: string, deadlineIso: string, id?: number) => Promise<void>;
}

export function AddGoalSheet({ visible, editing, weekStartsOn, onClose, onSave }: Props) {
  const now = useNow();
  const [title, setTitle] = useState('');
  const [deadline, setDeadline] = useState(() => addMonths(startOfDay(now), 1));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const submit = useSubmitGuard();

  // The sheet never unmounts, so load during render. Keyed on open/closed as well as
  // the row, so reopening starts from what is stored rather than from whatever was
  // typed and abandoned last time.
  const signature = `${visible}|${editing?.id ?? ''}`;
  const [loaded, setLoaded] = useState(signature);
  if (signature !== loaded) {
    setLoaded(signature);
    if (visible) {
      setTitle(editing?.title ?? '');
      setDeadline(editing ? startOfDay(new Date(editing.deadline)) : addMonths(startOfDay(now), 1));
      setPickerOpen(false);
      setFailed(false);
    }
  }

  const presets = useMemo(
    () => [
      { label: 'A week', date: addDays(startOfDay(now), 7) },
      { label: 'A month', date: addMonths(startOfDay(now), 1) },
      { label: '3 months', date: addMonths(startOfDay(now), 3) },
      { label: '6 months', date: addMonths(startOfDay(now), 6) },
    ],
    [now]
  );

  const canSave = title.trim().length > 0;

  function save() {
    if (!canSave) return;
    const name = title.trim();
    const deadlineIso = deadline.toISOString();
    const id = editing?.id;
    submit(async () => {
      try {
        await onSave(name, deadlineIso, id);
        setFailed(false);
        onClose();
      } catch (error) {
        console.error('goal save failed', error);
        setFailed(true);
      }
    });
  }

  return (
    <Sheet
      visible={visible}
      title={editing ? 'Edit goal' : 'Add goal'}
      subtitle="One thing, one date"
      onClose={onClose}
    >
      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>What are you aiming at?</Text>
        <TextInput
          style={styles.input}
          placeholder="Finish the portfolio site"
          placeholderTextColor={colors.inkFaint}
          value={title}
          onChangeText={setTitle}
          returnKeyType="done"
          onSubmitEditing={save}
        />

        <Text style={[styles.label, { marginTop: 22 }]}>Deadline</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {presets.map((p) => {
            const active = isSameDay(p.date, deadline);
            return (
              <Pressable
                key={p.label}
                style={[styles.chip, { backgroundColor: active ? colors.rose : colors.ground }]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${p.label}, ${format(p.date, 'MMMM d')}`}
                onPress={() => {
                  haptics.tick();
                  setDeadline(p.date);
                }}
              >
                <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{p.label}</Text>
                <Text style={[styles.chipDate, active && styles.chipDateActive]}>{format(p.date, 'MMM d')}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Pressable
          style={styles.pickRow}
          onPress={() => setPickerOpen(!pickerOpen)}
          accessibilityRole="button"
          accessibilityState={{ expanded: pickerOpen }}
          accessibilityLabel={`Pick an exact date. Currently ${format(deadline, 'EEEE, MMMM d')}`}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.pickLabel}>{pickerOpen ? 'Pick a date' : 'Or pick an exact date'}</Text>
            <Text style={styles.pickValue}>{format(deadline, 'EEEE, MMMM d, yyyy')}</Text>
          </View>
          <Text style={styles.pickToggle}>{pickerOpen ? 'Done' : 'Calendar'}</Text>
        </Pressable>

        {pickerOpen ? (
          <View style={styles.calendar}>
            <MonthCalendar
              value={deadline}
              onChange={setDeadline}
              minDate={startOfDay(now)}
              weekStartsOn={weekStartsOn}
            />
          </View>
        ) : null}

        {failed ? (
          <View style={styles.banner}>
            <Banner message="Couldn't save that — try again." />
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.action, !canSave && styles.disabled]} pointerEvents={canSave ? 'auto' : 'none'}>
        <PrimaryButton
          label={canSave ? (editing ? 'Save changes' : 'Save goal') : 'Name it first'}
          onPress={save}
        />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  scroll: { maxHeight: 400 },
  label: { fontFamily: font.regular, fontSize: 11.5, color: colors.inkSoft, marginTop: 20 },
  input: {
    fontFamily: font.semibold,
    fontSize: 17,
    color: colors.ink,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },

  chipRow: { gap: 8, paddingVertical: 10, alignItems: 'center' },
  chip: { borderRadius: radius.chip, paddingVertical: 10, paddingHorizontal: 15, alignItems: 'center' },
  chipLabel: { fontFamily: font.semibold, fontSize: 12.5, color: colors.ink },
  chipLabelActive: { color: colors.surface },
  chipDate: { fontFamily: font.regular, fontSize: 10.5, color: colors.inkSoft, marginTop: 2 },
  chipDateActive: { color: 'rgba(255,255,255,0.8)' },

  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.ground,
    borderRadius: 18,
    paddingVertical: 13,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  pickLabel: { fontFamily: font.regular, fontSize: 11, color: colors.inkSoft },
  pickValue: { fontFamily: font.semibold, fontSize: 13.5, color: colors.ink, marginTop: 2 },
  pickToggle: { fontFamily: font.semibold, fontSize: 12.5, color: colors.rose },

  calendar: { marginTop: 10 },
  banner: { marginTop: 14 },
  action: { marginTop: 18, marginBottom: 4 },
  disabled: { opacity: 0.4 },
});
