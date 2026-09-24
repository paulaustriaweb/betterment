import { format } from 'date-fns';
import { StyleSheet, Text } from 'react-native';

import { colors, font } from '@/lib/colors';
import type { Category, TimeBlock } from '@/lib/types';
import { BlockRow } from './BlockRow';
import { SwipeRow } from './SwipeRow';
import { Sheet } from './ui';

interface Props {
  visible: boolean;
  day: Date;
  isToday: boolean;
  blocks: TimeBlock[];
  categories: Category[];
  onClose: () => void;
  onEdit: (block: TimeBlock) => void;
  onDelete: (id: number) => void;
}

/** One day's entries: tap to edit, swipe to delete. */
export function EntriesSheet({ visible, day, isToday, blocks, categories, onClose, onEdit, onDelete }: Props) {
  return (
    <Sheet visible={visible} title={isToday ? "Today's entries" : 'Entries'} subtitle={format(day, 'EEEE, MMM d')} onClose={onClose}>
      {blocks.length === 0 ? (
        <Text style={styles.empty}>Nothing logged yet — the whole day is still empty.</Text>
      ) : (
        <>
          {blocks.map((b) => (
            <SwipeRow key={b.id} onDelete={() => onDelete(b.id)}>
              <BlockRow block={b} category={categories.find((c) => c.id === b.categoryId)} onPress={() => onEdit(b)} />
            </SwipeRow>
          ))}
          <Text style={styles.hint}>Tap to edit · swipe left to delete</Text>
        </>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  empty: { fontFamily: font.regular, fontSize: 13, color: colors.inkSoft, paddingVertical: 20, lineHeight: 19 },
  hint: { fontFamily: font.regular, fontSize: 11, color: colors.inkFaint, paddingVertical: 14 },
});
