import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useSetting } from '@/hooks/useSettings';
import { colors, font, radius } from '@/lib/colors';
import { parseTargets, type Target, type TargetResult } from '@/lib/targets';
import { formatDuration } from '@/lib/time';
import type { Category } from '@/lib/types';
import { CloseIcon, MinusIcon, PlusIcon } from './icons';
import { useToast } from './Toast';
import { Sheet } from './ui';

const STEP = 30;

/** Sensible first guess: things to do less of get a ceiling, everything else a floor. */
function starterTarget(category: Category): Target {
  const less = /scroll|gam|watch/i.test(category.name);
  const sleep = /sleep/i.test(category.name);
  return { categoryId: category.id, kind: less ? 'atMost' : 'atLeast', minutes: sleep ? 420 : less ? 120 : 60 };
}

function statusLine(target: Target, result: TargetResult | undefined): string {
  if (!result || result.days.length === 0) return target.kind === 'atLeast' ? 'at least, every day' : 'at most, every day';
  if (result.days.length > 1) return `met ${result.metDays} of ${result.days.length} days`;
  const { minutes, met } = result.days[0];
  if (target.kind === 'atLeast') {
    return met ? `${formatDuration(minutes)} · met` : `${formatDuration(minutes)} · ${formatDuration(target.minutes - minutes)} to go`;
  }
  return met ? `${formatDuration(minutes)} · within` : `${formatDuration(minutes)} · over by ${formatDuration(minutes - target.minutes)}`;
}

/**
 * Daily targets — "Sleep at least 7h", "Scrolling at most 2h" — set and checked in
 * one place. Results are for whatever range Overview is showing.
 */
export function TargetsSheet({
  visible,
  categories,
  results,
  onClose,
}: {
  visible: boolean;
  categories: Category[];
  results: TargetResult[];
  onClose: () => void;
}) {
  const [stored, setStored] = useSetting('targets', '[]');
  const targets = parseTargets(stored);
  const toast = useToast();

  async function save(next: Target[]) {
    try {
      await setStored(JSON.stringify(next));
    } catch (error) {
      console.error('targets save failed', error);
      toast("Couldn't save that — try again.", { tone: 'danger' });
    }
  }

  function change(categoryId: number, patch: Partial<Target>) {
    save(targets.map((t) => (t.categoryId === categoryId ? { ...t, ...patch } : t)));
  }

  const unused = categories.filter((c) => c.isActive && !targets.some((t) => t.categoryId === c.id));

  return (
    <Sheet visible={visible} title="Daily targets" subtitle="What a good day looks like" onClose={onClose}>
      <ScrollView style={styles.scroll}>
        {targets.length === 0 ? (
          <Text style={styles.empty}>
            No targets yet. Add one below — say, Sleep at least 7h, or Scrolling at most 2h. Overview then shows
            whether each day hit them.
          </Text>
        ) : null}

        {targets.map((t) => {
          const cat = categories.find((c) => c.id === t.categoryId);
          if (!cat) return null;
          const result = results.find((r) => r.target.categoryId === t.categoryId);
          const allMet = result && result.days.length > 0 && result.metDays === result.days.length;
          return (
            <View key={t.categoryId} style={styles.row}>
              <View style={styles.rowTop}>
                <View style={[styles.dot, { backgroundColor: cat.color }]} />
                <Text style={styles.name} numberOfLines={1}>
                  {cat.name}
                </Text>
                <Pressable
                  style={styles.kind}
                  onPress={() => change(t.categoryId, { kind: t.kind === 'atLeast' ? 'atMost' : 'atLeast' })}
                  accessibilityRole="button"
                  accessibilityLabel={`${t.kind === 'atLeast' ? 'At least' : 'At most'}. Tap to switch.`}
                >
                  <Text style={styles.kindLabel}>{t.kind === 'atLeast' ? 'at least' : 'at most'}</Text>
                </Pressable>
                <Pressable
                  style={styles.round}
                  onPress={() => change(t.categoryId, { minutes: Math.max(STEP, t.minutes - STEP) })}
                  accessibilityRole="button"
                  accessibilityLabel={`${cat.name} 30 minutes less`}
                  hitSlop={4}
                >
                  <MinusIcon color={colors.rose} size={13} />
                </Pressable>
                <Text style={styles.value}>{formatDuration(t.minutes)}</Text>
                <Pressable
                  style={styles.round}
                  onPress={() => change(t.categoryId, { minutes: Math.min(24 * 60, t.minutes + STEP) })}
                  accessibilityRole="button"
                  accessibilityLabel={`${cat.name} 30 minutes more`}
                  hitSlop={4}
                >
                  <PlusIcon color={colors.rose} size={13} />
                </Pressable>
                <Pressable
                  onPress={() => save(targets.filter((x) => x.categoryId !== t.categoryId))}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove the ${cat.name} target`}
                  hitSlop={8}
                  style={styles.remove}
                >
                  <CloseIcon color={colors.inkFaint} size={12} />
                </Pressable>
              </View>
              <Text style={[styles.status, allMet ? styles.statusMet : null]}>{statusLine(t, result)}</Text>
            </View>
          );
        })}

        {unused.length > 0 ? (
          <>
            <Text style={styles.addLabel}>Add a target</Text>
            <View style={styles.addRow}>
              {unused.map((c) => (
                <Pressable
                  key={c.id}
                  style={styles.addChip}
                  onPress={() => save([...targets, starterTarget(c)])}
                  accessibilityRole="button"
                  accessibilityLabel={`Add a target for ${c.name}`}
                >
                  <View style={[styles.dot, { backgroundColor: c.color }]} />
                  <Text style={styles.addChipLabel}>{c.name}</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  scroll: { marginTop: 12, maxHeight: 420 },
  empty: { fontFamily: font.regular, fontSize: 13, color: colors.inkSoft, lineHeight: 19, paddingVertical: 8 },
  row: { paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.line },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  name: { flex: 1, fontFamily: font.medium, fontSize: 13, color: colors.ink },
  kind: { backgroundColor: colors.ground, borderRadius: 11, paddingVertical: 5, paddingHorizontal: 9 },
  kindLabel: { fontFamily: font.semibold, fontSize: 11.5, color: colors.inkSoft },
  round: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.roseTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: { minWidth: 44, textAlign: 'center', fontFamily: font.bold, fontSize: 13, color: colors.ink, fontVariant: ['tabular-nums'] },
  remove: { paddingLeft: 2 },
  status: { fontFamily: font.regular, fontSize: 11.5, color: colors.inkSoft, marginTop: 5, marginLeft: 17 },
  statusMet: { fontFamily: font.semibold, color: '#256247' },
  addLabel: { fontFamily: font.semibold, fontSize: 12.5, color: colors.ink, marginTop: 16, marginBottom: 8 },
  addRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, paddingBottom: 8 },
  addChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.ground,
    borderRadius: radius.chip,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  addChipLabel: { fontFamily: font.medium, fontSize: 12.5, color: colors.ink },
});
