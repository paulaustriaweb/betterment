import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, font } from '@/lib/colors';
import { formatTime } from '@/lib/time';
import type { Category, TimeBlock } from '@/lib/types';

interface Props {
  block: TimeBlock;
  category: Category | undefined;
  onPress: () => void;
}

export function BlockRow({ block, category, onPress }: Props) {
  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && styles.rowPressed]} onPress={onPress}>
      <View style={[styles.dot, { backgroundColor: category?.color ?? colors.inkFaint }]} />
      <Text style={styles.label} numberOfLines={1}>
        {category?.name ?? 'Unknown'}
      </Text>
      <Text style={styles.time}>
        {formatTime(block.startTime)} – {formatTime(block.endTime)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 13,
    paddingHorizontal: 4,
    backgroundColor: colors.surface,
  },
  rowPressed: { opacity: 0.55 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  label: { flex: 1, fontFamily: font.medium, fontSize: 13, color: colors.ink },
  time: { fontFamily: font.regular, fontSize: 12, color: colors.inkSoft, fontVariant: ['tabular-nums'] },
});
