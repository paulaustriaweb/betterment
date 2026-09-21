import { format } from 'date-fns';
import { File, Paths } from 'expo-file-system';
import { Platform, Share } from 'react-native';

import { buildBackup, countRows } from '@/db/backup';

/**
 * The database lives in the browser's private storage, which "clear website data"
 * wipes without asking. This file is the only copy that outlives that, so it dumps
 * every table verbatim rather than a prettified summary.
 */
export async function exportBackup(): Promise<{ name: string; rows: number }> {
  const backup = buildBackup();
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
