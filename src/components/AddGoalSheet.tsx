import { addDays, addMonths, format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useNow } from '@/hooks/useNow';
import { colors, font, radius } from '@/lib/colors';
import { Banner } from './Banner';
import { PrimaryButton, Sheet } from './ui';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (title: string, deadlineIso: string) => void;
}

export function AddGoalSheet({ visible, onClose, onSave }: Props) {
  const now = useNow();
  const [title, setTitle] = useState('');
  const [offset, setOffset] = useState(30);
  const [failed, setFailed] = useState(false);

  // The sheet never unmounts, so reset on open — a title abandoned last time should
  // not be sitting in the field the next time it's pulled up.
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setTitle('');
      setOffset(30);
    }
  }

  // Keyed on `now`, not [] — "a week" has to mean a week from today, not a week
  // from whenever the app was last launched.
  const presets = useMemo(
    () => [
      { label: 'A week', days: 7, date: addDays(now, 7) },
      { label: 'A month', days: 30, date: addMonths(now, 1) },
      { label: '3 months', days: 90, date: addMonths(now, 3) },
      { label: '6 months', days: 180, date: addMonths(now, 6) },
    ],
    [now]
  );

  const deadline = presets.find((p) => p.days === offset)?.date ?? addDays(now, 30);
  const canSave = title.trim().length > 0;

  function save() {
    if (!canSave) return;
    try {
      onSave(title.trim(), deadline.toISOString());
      setFailed(false);
      setTitle('');
      setOffset(30);
      onClose();
    } catch (error) {
      // Without this the sheet just sat there doing nothing on a failed write.
      console.error('goal save failed', error);
      setFailed(true);
    }
  }

  return (
    <Sheet visible={visible} title="Add goal" subtitle="One thing, one date" onClose={onClose}>
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
          const active = p.days === offset;
          return (
            <Pressable
              key={p.days}
              style={[styles.chip, { backgroundColor: active ? colors.rose : colors.ground }]}
              onPress={() => {
                Haptics.selectionAsync();
                setOffset(p.days);
              }}
            >
              <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{p.label}</Text>
              <Text style={[styles.chipDate, active && styles.chipDateActive]}>{format(p.date, 'MMM d')}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text style={styles.summary}>Due {format(deadline, 'EEEE, MMMM d')}</Text>

      {failed ? (
        <View style={styles.banner}>
          <Banner message="Couldn't save that — try again." />
        </View>
      ) : null}

      <View style={canSave ? undefined : styles.disabled} pointerEvents={canSave ? 'auto' : 'none'}>
        <PrimaryButton label={canSave ? 'Save goal' : 'Name it first'} onPress={save} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
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

  summary: { fontFamily: font.medium, fontSize: 12.5, color: colors.roseDeep, marginTop: 10, marginBottom: 20 },
  banner: { marginBottom: 16 },
  disabled: { opacity: 0.4 },
});
