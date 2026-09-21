import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/lib/colors';
import { formatTime } from '@/lib/time';
import type { Category, TimeBlock } from '@/lib/types';

interface Props {
  block: TimeBlock;
  category: Category | undefined;
  onPress: () => void;
  onDelete: () => void;
}

export function BlockRow({ block, category, onPress, onDelete }: Props) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={[styles.dot, { backgroundColor: category?.color ?? colors.inkSoft }]} />
      <Text style={styles.label} numberOfLines={1}>
        {category?.name ?? 'Unknown'}
      </Text>
      <Text style={styles.time}>
        {formatTime(block.startTime)} – {formatTime(block.endTime)}
      </Text>
      <Pressable hitSlop={8} onPress={onDelete}>
        <Text style={styles.delete}>✕</Text>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { flex: 1, fontSize: 13, color: colors.ink },
  time: { fontSize: 12, color: colors.inkSoft },
  delete: { fontSize: 13, color: colors.inkSoft, paddingHorizontal: 6 },
});
