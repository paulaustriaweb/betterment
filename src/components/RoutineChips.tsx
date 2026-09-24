import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, font, radius } from '@/lib/colors';
import { shortClock, type Routine } from '@/lib/routines';
import type { Category } from '@/lib/types';

/** "Your usual": entries logged the same way before, one tap to fill in again. */
export function RoutineChips({
  routines,
  categories,
  onPick,
}: {
  routines: Routine[];
  categories: Category[];
  onPick: (routine: Routine) => void;
}) {
  const shown = routines.filter((r) => categories.some((c) => c.id === r.categoryId));
  if (shown.length === 0) return null;
  return (
    <>
      <Text style={styles.label}>Your usual</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {shown.map((r) => {
          const cat = categories.find((c) => c.id === r.categoryId);
          if (!cat) return null;
          const span = `${shortClock(r.start)}–${shortClock(r.end)}`;
          return (
            <Pressable
              key={`${r.categoryId}-${span}`}
              style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
              onPress={() => onPick(r)}
              accessibilityRole="button"
              accessibilityLabel={`${cat.name}, ${span}. Fill it in.`}
            >
              <View style={[styles.dot, { backgroundColor: cat.color }]} />
              <Text style={styles.name}>{cat.name}</Text>
              <Text style={styles.time}>{span}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: font.semibold, fontSize: 13, color: colors.ink, marginTop: 18, marginBottom: 9 },
  row: { gap: 8, paddingBottom: 3, alignItems: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: colors.roseTint,
    borderRadius: radius.chip,
    paddingVertical: 9,
    paddingHorizontal: 13,
  },
  pressed: { opacity: 0.6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  name: { fontFamily: font.semibold, fontSize: 12.5, color: colors.roseDeep },
  time: { fontFamily: font.medium, fontSize: 12, color: colors.roseDeep, fontVariant: ['tabular-nums'] },
});
