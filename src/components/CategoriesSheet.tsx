import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useCategories, useCategoryEdits } from '@/hooks/useCategories';
import { colors, font } from '@/lib/colors';
import { EyeIcon, EyeOffIcon } from './icons';
import { Sheet } from './ui';

/**
 * Rename and hide, but no adding or deleting: every entry points at a category id,
 * and the colours are design tokens rather than free choices. Renaming an unused
 * one is how you get a category the seed list didn't think of.
 */
export function CategoriesSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const categories = useCategories();
  const { rename, setActive } = useCategoryEdits();
  const [draft, setDraft] = useState<{ id: number; name: string } | null>(null);

  function commit() {
    if (draft && draft.name.trim()) rename(draft.id, draft.name.trim());
    setDraft(null);
  }

  return (
    <Sheet visible={visible} title="Categories" subtitle="Tap a name to rename it" onClose={onClose}>
      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
        {categories.map((c) => {
          const editing = draft?.id === c.id;
          return (
            <View key={c.id} style={styles.row}>
              <View style={[styles.dot, { backgroundColor: c.color }, !c.isActive && styles.dotOff]} />
              {editing ? (
                <TextInput
                  style={styles.input}
                  value={draft.name}
                  onChangeText={(name) => setDraft({ id: c.id, name })}
                  onBlur={commit}
                  onSubmitEditing={commit}
                  autoFocus
                  returnKeyType="done"
                  maxLength={28}
                />
              ) : (
                <Pressable
                  style={styles.nameWrap}
                  onPress={() => setDraft({ id: c.id, name: c.name })}
                  accessibilityRole="button"
                  accessibilityLabel={`Rename ${c.name}`}
                >
                  <Text style={[styles.name, !c.isActive && styles.nameOff]} numberOfLines={1}>
                    {c.name}
                  </Text>
                </Pressable>
              )}
              <Pressable
                style={styles.toggle}
                onPress={() => setActive(c.id, !c.isActive)}
                hitSlop={8}
                accessibilityRole="switch"
                accessibilityState={{ checked: c.isActive }}
                accessibilityLabel={`${c.isActive ? 'Hide' : 'Show'} ${c.name}`}
              >
                {c.isActive ? (
                  <EyeIcon color={colors.inkSoft} />
                ) : (
                  <EyeOffIcon color={colors.inkFaint} />
                )}
              </Pressable>
            </View>
          );
        })}
        <Text style={styles.hint}>
          Hidden categories drop out of the picker on Log. Anything already logged against one keeps its name
          and colour.
        </Text>
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  scroll: { marginTop: 14, maxHeight: 380 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dotOff: { opacity: 0.35 },
  nameWrap: { flex: 1 },
  name: { fontFamily: font.medium, fontSize: 13.5, color: colors.ink },
  nameOff: { color: colors.inkFaint },
  input: {
    flex: 1,
    fontFamily: font.semibold,
    fontSize: 13.5,
    color: colors.ink,
    padding: 0,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.rose,
    paddingBottom: 3,
  },
  toggle: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  hint: { fontFamily: font.regular, fontSize: 11.5, color: colors.inkSoft, lineHeight: 17, paddingVertical: 16 },
});
