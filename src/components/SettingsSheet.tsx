import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { useSetting } from '@/hooks/useSettings';
import { exportBackup } from '@/lib/backup';
import { colors, font } from '@/lib/colors';
import { formatCurrency, isValidCurrency } from '@/lib/currency';
import { remindersSupported } from '@/lib/notifications';
import { BellIcon, DownloadIcon, TagIcon } from './icons';
import { DisclosureRow, Sheet } from './ui';

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
  const [draft, setDraft] = useState(currency);
  const [status, setStatus] = useState<string | null>(null);

  const valid = isValidCurrency(draft);

  function commitCurrency() {
    if (valid) setCurrency(draft.toUpperCase());
    else setDraft(currency);
  }

  async function backUp() {
    try {
      const { name, rows } = await exportBackup();
      setStatus(`Saved ${name} — ${rows} rows.`);
    } catch {
      setStatus("Couldn't save the file. Try again.");
    }
  }

  return (
    <Sheet
      visible={visible}
      title="Settings"
      subtitle="Yours to change"
      onClose={() => {
        setStatus(null);
        onClose();
      }}
    >
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

      <Text style={styles.note}>
        {status ??
          'Everything lives on this device only. Clearing website data erases it, so keep a backup somewhere else.'}
      </Text>
    </Sheet>
  );
}

const styles = StyleSheet.create({
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

  rows: { marginTop: 22, gap: 8 },
  note: { fontFamily: font.regular, fontSize: 11.5, color: colors.inkSoft, lineHeight: 17, marginTop: 20 },
});
