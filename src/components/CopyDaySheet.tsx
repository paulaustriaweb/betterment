import { format } from 'date-fns';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { TimeBlockInput } from '@/db/timeBlocks';
import { useSubmitGuard } from '@/hooks/useSubmitGuard';
import { colors, font } from '@/lib/colors';
import type { Draft } from '@/lib/copyDay';
import { formatTime } from '@/lib/time';
import type { Category } from '@/lib/types';
import { Banner } from './Banner';
import { CheckIcon } from './icons';
import { useToast } from './Toast';
import { PrimaryButton, Sheet } from './ui';

interface Props {
  visible: boolean;
  sourceDay: Date;
  targetDay: Date;
  drafts: Draft[];
  categories: Category[];
  add: (input: TimeBlockInput) => Promise<number>;
  remove: (id: number) => Promise<void>;
  onClose: () => void;
}

/** Yesterday's entries onto today, previewed first — untick whatever didn't repeat. */
export function CopyDaySheet({ visible, sourceDay, targetDay, drafts, categories, add, remove, onClose }: Props) {
  const [skipped, setSkipped] = useState<Set<number>>(new Set());
  const [failed, setFailed] = useState(false);
  const submit = useSubmitGuard();
  const toast = useToast();

  const signature = `${visible}|${targetDay.getTime()}`;
  const [loaded, setLoaded] = useState(signature);
  if (signature !== loaded) {
    setLoaded(signature);
    if (visible) {
      setSkipped(new Set());
      setFailed(false);
    }
  }

  const chosen = drafts.filter((_, i) => !skipped.has(i));

  function toggle(i: number) {
    setSkipped((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  function copy() {
    const picked = chosen;
    if (picked.length === 0) return;
    submit(async () => {
      const ids: number[] = [];
      try {
        for (const d of picked) ids.push(await add(d));
        onClose();
        toast(`Added ${picked.length} ${picked.length === 1 ? 'entry' : 'entries'}.`, {
          action: {
            label: 'Undo',
            onPress: async () => {
              for (const id of ids) await remove(id);
            },
          },
        });
      } catch (error) {
        console.error('copy day failed', error);
        setFailed(true);
      }
    });
  }

  return (
    <Sheet
      visible={visible}
      title="Copy yesterday"
      subtitle={`${format(sourceDay, 'EEE, MMM d')} onto ${format(targetDay, 'EEE, MMM d')}`}
      onClose={onClose}
    >
      {drafts.length === 0 ? (
        <Text style={styles.empty}>
          Nothing from yesterday fits — it would clash with what&apos;s logged, or it hasn&apos;t happened yet.
        </Text>
      ) : (
        <ScrollView style={styles.list}>
          {drafts.map((d, i) => {
            const on = !skipped.has(i);
            const cat = categories.find((c) => c.id === d.categoryId);
            return (
              <Pressable
                key={`${d.startTime}-${d.categoryId}`}
                style={styles.row}
                onPress={() => toggle(i)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={`${cat?.name ?? 'Entry'}, ${formatTime(d.startTime)} to ${formatTime(d.endTime)}`}
              >
                <View style={[styles.box, on && styles.boxOn]}>{on ? <CheckIcon color={colors.surface} size={12} /> : null}</View>
                <View style={[styles.dot, { backgroundColor: cat?.color ?? colors.inkFaint }]} />
                <Text style={[styles.name, !on && styles.off]} numberOfLines={1}>
                  {cat?.name ?? 'Unknown'}
                </Text>
                <Text style={[styles.time, !on && styles.off]}>
                  {formatTime(d.startTime)} – {formatTime(d.endTime)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {failed ? (
        <View style={styles.banner}>
          <Banner message="Couldn't add all of them — check the day, then try again." />
        </View>
      ) : null}

      {drafts.length > 0 ? (
        <View style={[styles.action, chosen.length === 0 && styles.disabled]} pointerEvents={chosen.length ? 'auto' : 'none'}>
          <PrimaryButton
            label={chosen.length === 0 ? 'Nothing picked' : `Add ${chosen.length} ${chosen.length === 1 ? 'entry' : 'entries'}`}
            onPress={copy}
          />
        </View>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  empty: { fontFamily: font.regular, fontSize: 13, color: colors.inkSoft, paddingVertical: 20, lineHeight: 19 },
  list: { marginTop: 12, maxHeight: 340 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11 },
  box: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.inkFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: colors.rose, borderColor: colors.rose },
  dot: { width: 9, height: 9, borderRadius: 5 },
  name: { flex: 1, fontFamily: font.medium, fontSize: 13, color: colors.ink },
  time: { fontFamily: font.regular, fontSize: 12, color: colors.inkSoft, fontVariant: ['tabular-nums'] },
  off: { color: colors.inkFaint },
  banner: { marginTop: 10 },
  action: { marginTop: 16 },
  disabled: { opacity: 0.4 },
});
