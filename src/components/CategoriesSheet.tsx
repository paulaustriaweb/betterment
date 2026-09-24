import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useCategories, useCategoryEdits } from '@/hooks/useCategories';
import { categoryColors, colors, font } from '@/lib/colors';
import { Banner } from './Banner';
import { useToast } from './Toast';
import { EyeIcon, EyeOffIcon } from './icons';
import { Sheet } from './ui';

/**
 * Rename and hide, but no adding or deleting: every entry points at a category id,
 * and the colours are design tokens rather than free choices. Renaming an unused
 * one is how you get a category the seed list didn't think of.
 */
export function CategoriesSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const categories = useCategories();
  const { rename, setActive, create } = useCategoryEdits();
  const [newName, setNewName] = useState<string | null>(null);
  const [newColor, setNewColor] = useState<string>(categoryColors.other.dot);
  const [draft, setDraft] = useState<{ id: number; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  async function commit() {
    const pending = draft;
    setDraft(null);
    if (!pending || !pending.name.trim()) return;
    const next = pending.name.trim();
    const before = categories.find((c) => c.id === pending.id);
    if (before?.name === next) return;
    try {
      await rename(pending.id, next);
      setError(null);
      toast(`Renamed to "${next}".`, {
        action: before ? { label: 'Undo', onPress: () => rename(pending.id, before.name) } : undefined,
      });
    } catch (e) {
      console.error('category rename failed', e);
      setError("Couldn't rename that — try again.");
      toast("Couldn't rename that — try again.", { tone: 'danger' });
    }
  }

  async function addCategory() {
    const name = (newName ?? '').trim();
    setNewName(null);
    if (!name) return;
    if (categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      setError(`There's already a category called ${name}.`);
      return;
    }
    try {
      await create(name, newColor);
      setError(null);
      toast(`Added ${name}.`);
    } catch (e) {
      console.error('category add failed', e);
      setError("Couldn't add that — try again.");
      toast("Couldn't add that — try again.", { tone: 'danger' });
    }
  }

  async function toggleActive(id: number, name: string, active: boolean) {
    try {
      await setActive(id, active);
      setError(null);
      toast(active ? `${name} is back.` : `${name} hidden.`, {
        action: { label: 'Undo', onPress: () => setActive(id, !active) },
      });
    } catch (e) {
      console.error('category visibility failed', e);
      setError("Couldn't change that — try again.");
      toast("Couldn't change that — try again.", { tone: 'danger' });
    }
  }

  return (
    <Sheet visible={visible} title="Categories" subtitle="Tap a name to rename it · add your own" onClose={onClose}>
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
                onPress={() => toggleActive(c.id, c.name, !c.isActive)}
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
        {newName === null ? (
          <Pressable
            style={styles.addRow}
            onPress={() => setNewName('')}
            accessibilityRole="button"
            accessibilityLabel="Add a category"
          >
            <Text style={styles.addLabel}>+ Add a category</Text>
          </Pressable>
        ) : (
          <View style={styles.newBox}>
            <TextInput
              style={styles.input}
              value={newName}
              onChangeText={setNewName}
              onSubmitEditing={addCategory}
              placeholder="Like Gym, or Commute"
              placeholderTextColor={colors.inkFaint}
              autoFocus
              returnKeyType="done"
              maxLength={28}
            />
            <View style={styles.swatches}>
              {Object.values(categoryColors).map((c) => (
                <Pressable
                  key={c.dot}
                  style={[styles.swatch, { backgroundColor: c.dot }, newColor === c.dot && styles.swatchOn]}
                  onPress={() => setNewColor(c.dot)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: newColor === c.dot }}
                  accessibilityLabel="Colour"
                />
              ))}
            </View>
            <View style={styles.newActions}>
              <Pressable onPress={() => setNewName(null)} accessibilityRole="button" style={styles.newCancel}>
                <Text style={styles.newCancelLabel}>Cancel</Text>
              </Pressable>
              <Pressable onPress={addCategory} accessibilityRole="button" style={styles.newSave}>
                <Text style={styles.newSaveLabel}>Add</Text>
              </Pressable>
            </View>
          </View>
        )}

        {error ? (
          <View style={styles.banner}>
            <Banner message={error} />
          </View>
        ) : null}

        <Text style={styles.hint}>
          Colours are shared with the built-in categories. Hidden categories drop out of the picker on Log. Anything already logged against one keeps its name
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
  addRow: { paddingVertical: 13 },
  addLabel: { fontFamily: font.semibold, fontSize: 13.5, color: colors.rose },
  newBox: { paddingVertical: 12, gap: 12 },
  swatches: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  swatch: { width: 26, height: 26, borderRadius: 13 },
  swatchOn: { borderWidth: 3, borderColor: colors.ink },
  newActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  newCancel: { paddingVertical: 9, paddingHorizontal: 14 },
  newCancelLabel: { fontFamily: font.semibold, fontSize: 13, color: colors.inkSoft },
  newSave: { paddingVertical: 9, paddingHorizontal: 18, borderRadius: 16, backgroundColor: colors.ink },
  newSaveLabel: { fontFamily: font.semibold, fontSize: 13, color: colors.surface },
  banner: { marginTop: 12 },
  hint: { fontFamily: font.regular, fontSize: 11.5, color: colors.inkSoft, lineHeight: 17, paddingVertical: 16 },
});
