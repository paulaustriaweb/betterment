import { format, formatDistanceToNowStrict } from 'date-fns';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { buildBackup, restoreBackup } from '@/db/backup';
import { countDuplicates, eraseLoggedData, removeDuplicates } from '@/db/duplicates';
import { useDbVersion, useWrite } from '@/hooks/DbVersionContext';
import { useDbQuery } from '@/hooks/useDbQuery';
import { useSetting } from '@/hooks/useSettings';
import { useSubmitGuard } from '@/hooks/useSubmitGuard';
import { exportBackup, pickBackup } from '@/lib/backup';
import { countRows, type Backup } from '@/lib/backupFormat';
import { colors, font, radius } from '@/lib/colors';
import { Banner } from './Banner';
import { useToast } from './Toast';
import { DownloadIcon, TimelineIcon, TrashIcon } from './icons';
import { DisclosureRow } from './ui';

/** Backup, restore and duplicate clean-up — the rows in Settings that touch everything. */
export function DataRows() {
  const toast = useToast();
  const write = useWrite();
  const submit = useSubmitGuard();
  const { version } = useDbVersion();
  const duplicates = useDbQuery('duplicates', countDuplicates, 0).data;
  const [prepared, setPrepared] = useState<Backup | null>(null);
  const [restoring, setRestoring] = useState<Backup | null>(null);
  const [erasing, setErasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastBackup, setLastBackup] = useSetting('last_backup_at', '');

  // Built as the sheet opens, so the tap on "Back up" can hand it straight to the
  // share sheet — Safari refuses one that opens after an await.
  useEffect(() => {
    let live = true;
    buildBackup().then(
      (backup) => {
        if (live) setPrepared(backup);
      },
      (e: unknown) => console.error('backup prepare failed', e)
    );
    return () => {
      live = false;
    };
  }, [version]);

  async function backUp() {
    try {
      const { name, rows } = await exportBackup(prepared);
      // Remembered so Settings can say how old the latest copy is. If only this
      // fails, the file still saved — don't report the backup as failed.
      setLastBackup(new Date().toISOString()).catch((e: unknown) => console.error('backup date save failed', e));
      setError(null);
      toast(`Saved ${name} — ${rows} rows.`, { durationMs: 5000 });
    } catch (e) {
      console.error('backup failed', e);
      setError("Couldn't save the file — try again.");
    }
  }

  async function chooseRestore() {
    try {
      // First thing in the tap: on web the picker only opens inside the gesture.
      const backup = await pickBackup();
      setError(null);
      if (backup) setRestoring(backup);
    } catch (e) {
      console.error('restore pick failed', e);
      setError(e instanceof Error ? e.message : "Couldn't read that file.");
    }
  }

  function confirmRestore() {
    const backup = restoring;
    if (!backup) return;
    submit(async () => {
      try {
        await write(() => restoreBackup(backup));
        setRestoring(null);
        setError(null);
        toast(`Restored ${countRows(backup)} rows.`, { durationMs: 5000 });
      } catch (e) {
        console.error('restore failed', e);
        setError("Couldn't restore that — nothing was changed.");
        toast("Couldn't restore that — nothing was changed.", { tone: 'danger' });
      }
    });
  }

  function confirmErase() {
    submit(async () => {
      try {
        await write(eraseLoggedData);
        setErasing(false);
        setError(null);
        toast('Erased. A fresh start.', { durationMs: 4000 });
      } catch (e) {
        console.error('erase failed', e);
        setError("Couldn't erase — nothing was changed.");
      }
    });
  }

  function cleanDuplicates() {
    submit(async () => {
      try {
        const removed = await write(removeDuplicates);
        setError(null);
        toast(removed === 1 ? 'Removed 1 duplicate.' : `Removed ${removed} duplicates.`);
      } catch (e) {
        console.error('duplicate clean-up failed', e);
        setError("Couldn't remove those — try again.");
      }
    });
  }

  const exportedOn = restoring?.exportedAt ? new Date(restoring.exportedAt) : null;

  return (
    <View style={styles.rows}>
      <DisclosureRow
        icon={<DownloadIcon color={colors.rose} />}
        title="Back up my data"
        hint={
          lastBackup
            ? `Last saved ${formatDistanceToNowStrict(new Date(lastBackup), { addSuffix: true })}`
            : 'Never saved — keep a copy somewhere safe'
        }
        onPress={backUp}
      />
      <DisclosureRow
        icon={<TimelineIcon color={colors.rose} />}
        title="Restore from a backup"
        hint="Replaces what's on this device"
        onPress={chooseRestore}
      />
      {duplicates > 0 ? (
        <DisclosureRow
          icon={<TrashIcon color={colors.rose} />}
          title="Remove duplicate entries"
          hint={`${duplicates} exact ${duplicates === 1 ? 'copy' : 'copies'} from double taps`}
          onPress={cleanDuplicates}
        />
      ) : null}

      {restoring ? (
        <View style={styles.confirm}>
          <Text style={styles.confirmTitle}>Replace everything on this device?</Text>
          <Text style={styles.confirmBody}>
            The backup{exportedOn && !Number.isNaN(exportedOn.getTime()) ? ` from ${format(exportedOn, 'MMM d, yyyy')}` : ''}{' '}
            has {countRows(restoring)} rows. What&apos;s here now is deleted first — back it up above if you might
            want it again.
          </Text>
          <View style={styles.confirmActions}>
            <Pressable
              style={[styles.confirmButton, styles.keep]}
              onPress={() => setRestoring(null)}
              accessibilityRole="button"
            >
              <Text style={styles.keepLabel}>Keep what&apos;s here</Text>
            </Pressable>
            <Pressable
              style={[styles.confirmButton, styles.replace]}
              onPress={confirmRestore}
              accessibilityRole="button"
            >
              <Text style={styles.replaceLabel}>Replace</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <DisclosureRow
        icon={<TrashIcon color={colors.danger} />}
        title="Erase everything logged"
        hint="Entries, money and goals — categories and settings stay"
        onPress={() => setErasing(true)}
      />

      {erasing ? (
        <View style={styles.confirm}>
          <Text style={styles.confirmTitle}>Erase everything logged?</Text>
          <Text style={styles.confirmBody}>
            Every entry, transaction and goal goes, and there&apos;s no undo. Back it up above first if you might want
            it again.
          </Text>
          <View style={styles.confirmActions}>
            <Pressable style={[styles.confirmButton, styles.keep]} onPress={() => setErasing(false)} accessibilityRole="button">
              <Text style={styles.keepLabel}>Keep it</Text>
            </Pressable>
            <Pressable style={[styles.confirmButton, styles.replace]} onPress={confirmErase} accessibilityRole="button">
              <Text style={styles.replaceLabel}>Erase</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {error ? <Banner message={error} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  rows: { gap: 8 },
  confirm: { backgroundColor: colors.ground, borderRadius: radius.card, padding: 16, marginTop: 4 },
  confirmTitle: { fontFamily: font.semibold, fontSize: 13.5, color: colors.ink },
  confirmBody: { fontFamily: font.regular, fontSize: 12, color: colors.inkSoft, lineHeight: 17, marginTop: 5 },
  confirmActions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  confirmButton: { flex: 1, height: 42, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  keep: { backgroundColor: colors.surface },
  keepLabel: { fontFamily: font.semibold, fontSize: 13, color: colors.ink },
  replace: { backgroundColor: colors.danger },
  replaceLabel: { fontFamily: font.semibold, fontSize: 13, color: colors.surface },
});
