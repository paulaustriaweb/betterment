import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useSetting } from '@/hooks/useSettings';
import { exportBackup } from '@/lib/backup';
import { colors, font } from '@/lib/colors';
import { formatCurrency, isValidCurrency } from '@/lib/currency';
import { formatDuration } from '@/lib/time';
import { remindersSupported } from '@/lib/notifications';
import { Banner } from './Banner';
import { useToast } from './Toast';
import { BellIcon, DownloadIcon, TagIcon } from './icons';
import { DisclosureRow, Sheet } from './ui';

const WEEK_STARTS = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
];

const DEFAULT_DURATIONS = [15, 30, 60, 90, 120];

export function SettingsSheet({
  visible,
  onClose,
  onOpenReminder,
  onOpenCategories,
}: {
  visible: boolean;
  onClose: () => void;
  onOpenReminder: () => void;
  onOpenCategories: () => void;
}) {
  const [currency, setCurrency] = useSetting('currency', 'PHP');
  const [reminderTime] = useSetting('reminder_time', '23:30');
  const [reminderOn] = useSetting('reminder_enabled', '0');
  const [weekStart, setWeekStart] = useSetting('week_starts_on', '0');
  const [defaultDuration, setDefaultDuration] = useSetting('default_duration', '60');
  const [draft, setDraft] = useState(currency);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const valid = isValidCurrency(draft);

  function commitCurrency() {
    if (!valid) {
      setDraft(currency);
      return;
    }
    const next = draft.toUpperCase();
    if (next === currency) return;
    try {
      setCurrency(next);
      setError(null);
      toast(`Currency is now ${next}.`);
    } catch (e) {
      console.error('currency save failed', e);
      setError("Couldn't save that — try again.");
    }
  }

  function pickWeekStart(value: string) {
    if (value === weekStart) return;
    try {
      setWeekStart(value);
      setError(null);
      toast(`Weeks now start on ${value === '1' ? 'Monday' : 'Sunday'}.`);
    } catch (e) {
      console.error('week start save failed', e);
      setError("Couldn't save that — try again.");
    }
  }

  function pickDuration(minutes: number) {
    const value = String(minutes);
    if (value === defaultDuration) return;
    try {
      setDefaultDuration(value);
      setError(null);
      toast(`New entries start at ${formatDuration(minutes)}.`);
    } catch (e) {
      console.error('default duration save failed', e);
      setError("Couldn't save that — try again.");
    }
  }

  async function backUp() {
    try {
      const { name, rows } = await exportBackup();
      setError(null);
      toast(`Saved ${name} — ${rows} rows.`, { durationMs: 5000 });
    } catch (e) {
      console.error('backup failed', e);
      setError("Couldn't save the file — try again.");
    }
  }

  return (
    <Sheet
      visible={visible}
      title="Settings"
      subtitle="Yours to change"
      onClose={() => {
        setError(null);
        onClose();
      }}
    >
      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Currency</Text>
          <View style={styles.currencyRow}>
            <TextInput
              style={[styles.currencyInput, !valid && styles.currencyInvalid]}
              value={draft}
              onChangeText={(v) => setDraft(v.toUpperCase())}
              onBlur={commitCurrency}
              onSubmitEditing={commitCurrency}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={3}
              returnKeyType="done"
              accessibilityLabel="Three-letter currency code"
            />
            <Text style={styles.currencyPreview}>
              {valid ? formatCurrency(1234, draft) : 'Three letters, like USD'}
            </Text>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Weeks start on</Text>
          <View style={styles.optionRow}>
            {WEEK_STARTS.map((o) => {
              const active = o.value === weekStart;
              return (
                <Pressable
                  key={o.value}
                  style={[styles.option, active && styles.optionActive]}
                  onPress={() => pickWeekStart(o.value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={o.label}
                >
                  <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>{o.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>New entries start at</Text>
          <View style={styles.optionRow}>
            {DEFAULT_DURATIONS.map((m) => {
              const active = String(m) === defaultDuration;
              return (
                <Pressable
                  key={m}
                  style={[styles.option, active && styles.optionActive]}
                  onPress={() => pickDuration(m)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={formatDuration(m)}
                >
                  <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>
                    {formatDuration(m)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.rows}>
          <DisclosureRow
            icon={<TagIcon color={colors.rose} />}
            title="Categories"
            hint="Rename them, or hide the ones you never use"
            onPress={onOpenCategories}
          />
          <DisclosureRow
            icon={<BellIcon color={colors.rose} />}
            title="Nightly reminder"
            hint={
              remindersSupported
                ? reminderOn === '1'
                  ? `On at ${reminderTime}`
                  : 'Off'
                : 'Not available on the web app'
            }
            onPress={onOpenReminder}
          />
          <DisclosureRow
            icon={<DownloadIcon color={colors.rose} />}
            title="Back up my data"
            hint="Everything as one JSON file"
            onPress={backUp}
          />
        </View>

        {error ? (
          <View style={styles.banner}>
            <Banner message={error} />
          </View>
        ) : null}

        <Text style={styles.note}>
          Everything lives on this device only. Clearing website data erases it, so keep a backup somewhere
          else.
        </Text>
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  scroll: { maxHeight: 430 },
  field: { marginTop: 20 },
  fieldLabel: { fontFamily: font.regular, fontSize: 11.5, color: colors.inkSoft },
  currencyRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 6 },
  currencyInput: {
    fontFamily: font.bold,
    fontSize: 26,
    letterSpacing: -0.6,
    color: colors.ink,
    padding: 0,
    minWidth: 76,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.rose,
    paddingBottom: 3,
  },
  currencyInvalid: { borderBottomColor: colors.danger, color: colors.danger },
  currencyPreview: { flex: 1, fontFamily: font.medium, fontSize: 13, color: colors.inkSoft },

  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 8 },
  option: { borderRadius: 15, paddingVertical: 9, paddingHorizontal: 14, backgroundColor: colors.ground },
  optionActive: { backgroundColor: colors.rose },
  optionLabel: { fontFamily: font.semibold, fontSize: 12.5, color: colors.ink },
  optionLabelActive: { color: colors.surface },

  rows: { marginTop: 22, gap: 8 },
  banner: { marginTop: 14 },
  note: { fontFamily: font.regular, fontSize: 11.5, color: colors.inkSoft, lineHeight: 17, marginTop: 18, marginBottom: 6 },
});
