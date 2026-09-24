import { StyleSheet, View } from 'react-native';

import type { Slice } from '@/lib/report';
import type { Category } from '@/lib/types';

/**
 * Where the logged time went, as one bar: each category's share, largest first.
 * Plain flex segments, no chart library.
 */
export function CategoryBar({ slices, categories }: { slices: Slice[]; categories: Category[] }) {
  const total = slices.reduce((sum, s) => sum + s.minutes, 0);
  return (
    <View style={styles.track} accessible={false}>
      {total > 0
        ? slices.map((s) => (
            <View
              key={s.categoryId}
              style={{
                flex: s.minutes / total,
                backgroundColor: categories.find((c) => c.id === s.categoryId)?.color ?? '#93858A',
              }}
            />
          ))
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    gap: 2,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
});
