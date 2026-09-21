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
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
    return { name, rows };
  }

  const file = new File(Paths.document, name);
  file.create({ overwrite: true });
  file.write(json);
  await Share.share({ url: file.uri, title: name });
  return { name, rows };
}
