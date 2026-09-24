import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { useSetting } from '@/hooks/useSettings';
import { colors, font } from '@/lib/colors';
import { formatCurrency, isValidCurrency } from '@/lib/currency';
import { setHapticsEnabled } from '@/lib/haptics';
import { remindersSupported } from '@/lib/notifications';
import { parseTargets } from '@/lib/targets';
import { formatDuration } from '@/lib/time';
import { Banner } from './Banner';
import { DataRows } from './DataRows';
import { useToast } from './Toast';
import { BellIcon, CheckIcon, TagIcon } from './icons';
import { DisclosureRow, Sheet } from './ui';

const WEEK_STARTS = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
];
const DEFAULT_DURATIONS = [15, 30, 60, 90, 120].map((m) => ({ value: String(m), label: formatDuration(m) }));
const NIGHT_ENDS = [
  { value: '0', label: 'Midnight' },
  { value: '3', label: '3 AM' },
  { value: '4', label: '4 AM' },
  { value: '5', label: '5 AM' },
  { value: '6', label: '6 AM' },
];

function Options({
  options,
  value,
  onPick,
}: {
  options: { value: string; label: string }[];
  value: string;
  onPick: (value: string) => void;
}) {
  return (
    <View style={styles.optionRow}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            style={[styles.option, active && styles.optionActive]}
            onPress={() => onPick(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={o.label}
          >
            <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SettingsSheet({
  visible,
  onClose,
  onOpenReminder,
  onOpenCategories,
  onOpenTargets,
}: {
  visible: boolean;
  onClose: () => void;
  onOpenReminder: () => void;
  onOpenCategories: () => void;
  onOpenTargets: () => void;
}) {
  const [currency, setCurrency] = useSetting('currency', 'PHP');
  const [reminderTime] = useSetting('reminder_time', '23:30');
  const [reminderOn] = useSetting('reminder_enabled', '0');
  const [weekStart, setWeekStart] = useSetting('week_starts_on', '0');
  const [defaultDuration, setDefaultDuration] = useSetting('default_duration', '60');
  const [nightEnds, setNightEnds] = useSetting('night_ends', '5');
  const [haptics, setHaptics] = useSetting('haptics', '1');
  const [targets] = useSetting('targets', '[]');
  const [draft, setDraft] = useState(currency);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const valid = isValidCurrency(draft);
  const targetCount = parseTargets(targets).length;

  /** Every setting saves the same way: write, confirm in a toast, say so if it failed. */
  async function save(write: () => Promise<void>, message: string) {
    try {
      await write();
      setError(null);
      toast(message);
    } catch (e) {
      console.error('setting save failed', e);
      setError("Couldn't save that — try again.");
    }
  }

  function commitCurrency() {
    if (!valid) {
      setDraft(currency);
      return;
    }
    const next = draft.toUpperCase();
    if (next !== currency) save(() => setCurrency(next), `Currency is now ${next}.`);
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
        <Text style={styles.section}>Your day</Text>
        <DisclosureRow
          icon={<CheckIcon color={colors.rose} />}
          title="Daily targets"
          hint={targetCount === 0 ? 'Like Sleep 7h, or Scrolling under 2h' : `${targetCount} set`}
          onPress={onOpenTargets}
        />
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>New entries start at</Text>
          <Options
            options={DEFAULT_DURATIONS}
            value={defaultDuration}
            onPick={(v) => v !== defaultDuration && save(() => setDefaultDuration(v), `New entries start at ${formatDuration(Number(v))}.`)}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Night ends at</Text>
          <Text style={styles.fieldHint}>Until then, Overview shows the day you&apos;re wrapping up as &ldquo;Tonight&rdquo;.</Text>
          <Options
            options={NIGHT_ENDS}
            value={nightEnds}
            onPick={(v) =>
              v !== nightEnds &&
              save(() => setNightEnds(v), v === '0' ? 'Days now end at midnight.' : `Nights now end at ${v} AM.`)
            }
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Weeks start on</Text>
          <Options
            options={WEEK_STARTS}
            value={weekStart}
            onPick={(v) =>
              v !== weekStart && save(() => setWeekStart(v), `Weeks now start on ${v === '1' ? 'Monday' : 'Sunday'}.`)
            }
          />
        </View>

        <Text style={styles.section}>App</Text>
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
            <Text style={styles.currencyPreview}>{valid ? formatCurrency(1234, draft) : 'Three letters, like USD'}</Text>
          </View>
        </View>
        <View style={[styles.field, styles.switchRow]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchTitle}>Vibration on taps</Text>
            <Text style={styles.fieldHint}>The small buzz when you pick a category or check a goal.</Text>
          </View>
          <Switch
            value={haptics !== '0'}
            onValueChange={(on) => {
              setHapticsEnabled(on);
              save(() => setHaptics(on ? '1' : '0'), on ? 'Vibration on.' : 'Vibration off.');
            }}
            trackColor={{ true: colors.rose, false: colors.gap }}
            thumbColor={colors.surface}
            accessibilityLabel="Vibration on taps"
          />
        </View>
        <View style={styles.rows}>
          <DisclosureRow
            icon={<TagIcon color={colors.rose} />}
            title="Categories"
            hint="Add, rename, or hide the ones you never use"
            onPress={onOpenCategories}
          />
          <DisclosureRow
            icon={<BellIcon color={colors.rose} />}
            title="Nightly reminder"
            hint={
              remindersSupported ? (reminderOn === '1' ? `On at ${reminderTime}` : 'Off') : 'Not available on the web app'
            }
            onPress={onOpenReminder}
          />
        </View>

        <Text style={styles.section}>Your data</Text>
        <DataRows />

        {error ? (
          <View style={styles.banner}>
            <Banner message={error} />
          </View>
        ) : null}

        <Text style={styles.note}>
          Everything lives on this device only. Clearing website data erases it, so keep a backup somewhere else.
        </Text>
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  scroll: { maxHeight: 520 },
  section: {
    fontFamily: font.semibold,
    fontSize: 11.5,
    color: colors.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 22,
    marginBottom: 10,
  },
  field: { marginTop: 16 },
  fieldLabel: { fontFamily: font.semibold, fontSize: 12.5, color: colors.ink },
  fieldHint: { fontFamily: font.regular, fontSize: 11.5, color: colors.inkSoft, marginTop: 3, lineHeight: 16 },
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

  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  switchTitle: { fontFamily: font.semibold, fontSize: 12.5, color: colors.ink },

  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 8 },
  option: { borderRadius: 15, paddingVertical: 9, paddingHorizontal: 14, backgroundColor: colors.ground },
  optionActive: { backgroundColor: colors.rose },
  optionLabel: { fontFamily: font.semibold, fontSize: 12.5, color: colors.ink },
  optionLabelActive: { color: colors.surface },

  rows: { marginTop: 16, gap: 8 },
  banner: { marginTop: 14 },
  note: { fontFamily: font.regular, fontSize: 11.5, color: colors.inkSoft, lineHeight: 17, marginTop: 18, marginBottom: 6 },
});
