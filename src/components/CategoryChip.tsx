import * as haptics from '@/lib/haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, font, radius } from '@/lib/colors';
import type { Category } from '@/lib/types';

interface Props {
  category: Category;
  selected: boolean;
  onSelect: (id: number) => void;
}

export function CategoryChip({ category, selected, onSelect }: Props) {
  return (
    <Pressable
      style={[styles.chip, { backgroundColor: selected ? colors.ink : colors.surface }]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={category.name}
      onPress={() => {
        haptics.tick();
        onSelect(category.id);
      }}
    >
      <View style={[styles.dot, { backgroundColor: selected ? colors.rosePop : category.color }]} />
      <Text
        style={[
          styles.label,
          { color: selected ? colors.surface : colors.ink, fontFamily: selected ? font.semibold : font.medium },
        ]}
        numberOfLines={1}
      >
        {category.name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: radius.chip,
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  dot: { width: 9, height: 9, borderRadius: 5 },
  label: { fontSize: 12.5 },
});
