import { format } from 'date-fns';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import { Platform, Share } from 'react-native';

import { buildBackup } from '@/db/backup';
import { SCHEMA_VERSION } from '@/db/migrations';
import { countRows, parseBackup, type Backup } from './backupFormat';

/**
 * The database lives in the browser's private storage, which "clear website data"
 * wipes without asking. This file is the only copy that outlives that, so it dumps
 * every table verbatim rather than a prettified summary.
 *
 * Pass a backup built ahead of time (Settings builds one as it opens). Safari only
 * opens the share sheet inside the tap, and awaiting the database first can let
 * that window close.
 */
export async function exportBackup(prepared: Backup | null): Promise<{ name: string; rows: number }> {
  const backup = prepared ?? (await buildBackup());
  const json = JSON.stringify(backup, null, 2);
  const name = `betterment-${format(new Date(), 'yyyy-MM-dd')}.json`;
  const rows = countRows(backup);

  if (Platform.OS === 'web') {
    await saveInBrowser(json, name);
    return { name, rows };
  }

  const file = new File(Paths.document, name);
  file.create({ overwrite: true });
  file.write(json);
  await Share.share({ url: file.uri, title: name });
  return { name, rows };
}

/**
 * Asks for a backup file and checks it. Null if the picker was dismissed; throws a
 * readable sentence if the file is wrong. Nothing is written here — the caller
 * confirms first, because restoring replaces everything on the device.
 *
 * Call straight from the tap: on web the picker is a file input, and Safari only
 * opens it inside the user gesture.
 */
export async function pickBackup(): Promise<Backup | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', '*/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || result.assets.length === 0) return null;

  const asset = result.assets[0];
  const text = asset.file ? await asset.file.text() : await new File(asset.uri).text();
  return parseBackup(text, SCHEMA_VERSION);
}

async function saveInBrowser(json: string, name: string): Promise<void> {
  const blob = new Blob([json], { type: 'application/json' });

  // On an iOS home-screen app a plain download often goes nowhere, and the share
  // sheet is the only way to get the file somewhere it will survive. Must stay in
  // the same task as the tap, or the browser drops the user gesture.
  const shareable = new globalThis.File([blob], name, { type: 'application/json' });
  if (navigator.canShare?.({ files: [shareable] })) {
    try {
      await navigator.share({ files: [shareable], title: name });
      return;
    } catch (error) {
      // Dismissing the share sheet isn't a failure, and there's nothing left to do.
      if (error instanceof Error && error.name === 'AbortError') return;
      // Anything else: fall through to the download.
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  // Safari ignores a click on an anchor that isn't in the document, and revoking
  // the URL in the same tick can cancel the download before it starts.
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
