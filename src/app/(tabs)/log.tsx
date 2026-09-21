import { addMinutes, differenceInMinutes, format, isSameDay, startOfDay } from 'date-fns';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { BlockRow } from '@/components/BlockRow';
import { CategoryChip } from '@/components/CategoryChip';
import { DayTrack, type TrackBlock } from '@/components/DayTrack';
import { NoteIcon, PlusIcon, TimelineIcon } from '@/components/icons';
import { OverlapBanner } from '@/components/OverlapBanner';
import { SwipeRow } from '@/components/SwipeRow';
import { Card, DisclosureRow, PrimaryButton, ScreenHeader, Sheet, Stepper } from '@/components/ui';
import type { TimeBlockInput } from '@/db/timeBlocks';
import { useCategories } from '@/hooks/useCategories';
import { useLastTimeBlock, useTimeBlocksForDay } from '@/hooks/useTimeBlocks';
import { colors, font, spacing, type } from '@/lib/colors';
import { detectOverlap, formatDuration } from '@/lib/time';

const STEP = 15;
const MINUTES_PER_DAY = 24 * 60;
const PRESETS = [15, 30, 60, 120, 180];

export default function LogScreen() {
  const today = useMemo(() => new Date(), []);
  const dayStart = useMemo(() => startOfDay(today), [today]);
  const categories = useCategories();
  const lastBlock = useLastTimeBlock();
  const { blocks, add, update, remove } = useTimeBlocksForDay(today);

  const defaultStart = useMemo(() => {
    if (!lastBlock) return differenceInMinutes(today, dayStart);
    const lastEnd = new Date(lastBlock.endTime);
    return isSameDay(lastEnd, today) ? differenceInMinutes(lastEnd, dayStart) : differenceInMinutes(today, dayStart);
  }, [lastBlock, today, dayStart]);

  const [startMin, setStartMin] = useState(defaultStart);
  const [durMin, setDurMin] = useState(60);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [noteOpen, setNoteOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Arriving from a tapped gap on Agenda: prefill that stretch. Log is a tab, so
  // it never remounts — adjust during render when the params change rather than
  // syncing in an effect.
  const params = useLocalSearchParams<{ start?: string; dur?: string }>();
  const paramSignature = `${params.start ?? ''}|${params.dur ?? ''}`;
  const [appliedSignature, setAppliedSignature] = useState(paramSignature);
  if (paramSignature !== appliedSignature) {
    setAppliedSignature(paramSignature);
    if (params.start !== undefined) setStartMin(Number(params.start));
    if (params.dur !== undefined) setDurMin(Number(params.dur));
  }

  const startDate = addMinutes(dayStart, startMin);
  const endDate = addMinutes(dayStart, startMin + durMin);

  const overlap = useMemo(
    () => detectOverlap(blocks, startDate, endDate, editingId ?? undefined),
    [blocks, startDate, endDate, editingId]
  );
  const overlapName = overlap ? categories.find((c) => c.id === overlap.categoryId)?.name : undefined;

  const existingOnTrack: TrackBlock[] = useMemo(
    () =>
      blocks
        .filter((b) => b.id !== editingId)
        .map((b) => ({
          start: differenceInMinutes(new Date(b.startTime), dayStart),
          end: differenceInMinutes(new Date(b.endTime), dayStart),
          color: categories.find((c) => c.id === b.categoryId)?.color ?? colors.inkFaint,
        })),
    [blocks, categories, dayStart, editingId]
  );

  function setRange(nextStart: number, nextDur: number) {
    setStartMin(nextStart);
    setDurMin(nextDur);
  }

  function resetForm(nextStart: number = defaultStart) {
    setEditingId(null);
    setStartMin(Math.min(MINUTES_PER_DAY - STEP, Math.max(0, nextStart)));
    setDurMin(60);
    setCategoryId(null);
    setNote('');
    setNoteOpen(false);
  }

  function handleSave() {
    if (!categoryId) {
      Alert.alert('Pick a category', 'Choose what this block was.');
      return;
    }
    const input: TimeBlockInput = {
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      categoryId,
      note: note.trim() || null,
    };
    try {
      if (editingId) {
        update(editingId, input);
        resetForm();
      } else {
        add(input);
        // Chain to the end of the block just saved. defaultStart is memoised on
        // lastBlock and still holds its pre-save value during this handler.
        resetForm(startMin + durMin);
      }
    } catch {
      Alert.alert("Couldn't save", 'Try again.');
    }
  }

  function handleEdit(id: number) {
    const block = blocks.find((b) => b.id === id);
    if (!block) return;
    const s = new Date(block.startTime);
    const e = new Date(block.endTime);
    setEditingId(id);
    setStartMin(differenceInMinutes(s, dayStart));
    setDurMin(Math.max(STEP, differenceInMinutes(e, s)));
    setCategoryId(block.categoryId);
    setNote(block.note ?? '');
    setNoteOpen(Boolean(block.note));
    setListOpen(false);
  }

  function handleDelete(id: number) {
    try {
      remove(id);
      if (editingId === id) resetForm();
    } catch {
      Alert.alert("Couldn't delete", 'Try again.');
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ScreenHeader title="Log a block" subtitle={editingId ? 'Editing an entry' : 'New entry'} />

        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroLabel}>Duration</Text>
              <Text style={styles.heroValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                {formatDuration(durMin)}
              </Text>
            </View>
            <View style={styles.stepperPair}>
              <Stepper direction="down" tone="onRose" onPress={() => setDurMin(Math.max(STEP, durMin - STEP))} />
              <Stepper
                direction="up"
                tone="solid"
                onPress={() => setDurMin(Math.min(720, durMin + STEP))}
              />
            </View>
          </View>

          <View style={styles.presetRow}>
            {PRESETS.map((p) => {
              const active = p === durMin;
              return (
                <Pressable
                  key={p}
                  style={[styles.preset, active && styles.presetActive]}
                  onPress={() => setDurMin(Math.min(p, MINUTES_PER_DAY - startMin))}
                >
                  <Text style={[styles.presetLabel, active && styles.presetLabelActive]}>{formatDuration(p)}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Card style={styles.timeCard}>
          <View style={styles.timeRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Starts</Text>
              <Text style={styles.fieldValue}>{format(startDate, 'h:mm a')}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Ends</Text>
              <Text style={styles.fieldValue}>{format(endDate, 'h:mm a')}</Text>
            </View>
            <Pressable
              style={styles.endNow}
              onPress={() => setDurMin(Math.max(STEP, differenceInMinutes(new Date(), startDate)))}
            >
              <Text style={styles.endNowLabel}>End now</Text>
            </Pressable>
          </View>

          <View style={styles.trackWrap}>
            <DayTrack startMin={startMin} durMin={durMin} existing={existingOnTrack} onChange={setRange} />
          </View>

          <View style={styles.nudgeRow}>
            <Text style={styles.nudgeHint}>Drag the block, or nudge the start</Text>
            <View style={styles.stepperPairSmall}>
              <Stepper direction="down" onPress={() => setStartMin(Math.max(0, startMin - STEP))} />
              <Stepper
                direction="up"
                onPress={() => setStartMin(Math.min(MINUTES_PER_DAY - durMin, startMin + STEP))}
              />
            </View>
          </View>
        </Card>

        <Text style={styles.sectionLabel}>What were you doing?</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {categories.map((c) => (
            <CategoryChip key={c.id} category={c} selected={categoryId === c.id} onSelect={setCategoryId} />
          ))}
        </ScrollView>

        <View style={styles.disclosureGroup}>
          <DisclosureRow
            icon={<NoteIcon color={colors.rose} />}
            title={noteOpen ? 'Note' : 'Add a note'}
            onPress={() => setNoteOpen(!noteOpen)}
          />
          {noteOpen ? (
            <Card style={styles.noteCard}>
              <TextInput
                style={styles.noteInput}
                placeholder="What was this?"
                placeholderTextColor={colors.inkFaint}
                value={note}
                onChangeText={setNote}
                autoFocus
              />
            </Card>
          ) : null}

          <DisclosureRow
            icon={<TimelineIcon color={colors.rose} />}
            title="Today's blocks"
            hint={blocks.length === 0 ? 'Nothing logged yet' : `${blocks.length} logged · tap to edit`}
            onPress={() => setListOpen(true)}
          />
        </View>

        {overlap ? (
          <View style={styles.banner}>
            <OverlapBanner message={`Overlaps ${overlapName ?? 'another block'}. Drag clear, or save anyway.`} />
          </View>
        ) : null}

        <View style={styles.action}>
          <PrimaryButton
            label={editingId ? 'Save changes' : 'Save block'}
            onPress={handleSave}
            icon={<PlusIcon color={colors.surface} />}
          />
        </View>
      </ScrollView>

      <Sheet
        visible={listOpen}
        title="Today's blocks"
        subtitle={format(today, 'EEEE, MMM d')}
        onClose={() => setListOpen(false)}
      >
        {blocks.length === 0 ? (
          <Text style={styles.empty}>Nothing logged yet. All 24 hours are still unaccounted for.</Text>
        ) : (
          <>
            {blocks.map((b) => (
              <SwipeRow key={b.id} onDelete={() => handleDelete(b.id)}>
                <BlockRow
                  block={b}
                  category={categories.find((c) => c.id === b.categoryId)}
                  onPress={() => handleEdit(b.id)}
                />
              </SwipeRow>
            ))}
            <Text style={styles.hint}>Tap to edit · swipe left to delete</Text>
          </>
        )}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ground },
  scroll: { flex: 1 },
  content: { paddingTop: 26, paddingHorizontal: spacing.gutter, paddingBottom: 24 },

  heroCard: { backgroundColor: colors.rose, borderRadius: 26, padding: 18, marginTop: 16 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroLabel: { ...type.label, color: 'rgba(255,255,255,0.80)' },
  heroValue: {
    fontFamily: font.bold,
    fontSize: 40,
    letterSpacing: -1.8,
    color: colors.surface,
    marginTop: 5,
    fontVariant: ['tabular-nums'],
  },
  stepperPair: { flexDirection: 'row', gap: 9 },
  stepperPairSmall: { flexDirection: 'row', gap: 8 },

  presetRow: { flexDirection: 'row', gap: 7, marginTop: 16 },
  preset: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  presetActive: { backgroundColor: colors.surface },
  presetLabel: { fontFamily: font.semibold, fontSize: 12, color: colors.surface },
  presetLabelActive: { color: colors.rose },

  timeCard: { marginTop: 11 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  fieldLabel: { fontFamily: font.regular, fontSize: 11, color: colors.inkSoft },
  fieldValue: {
    fontFamily: font.semibold,
    fontSize: 18,
    color: colors.ink,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  endNow: { backgroundColor: colors.roseTint, borderRadius: 17, paddingVertical: 9, paddingHorizontal: 14 },
  endNowLabel: { fontFamily: font.semibold, fontSize: 12.5, color: colors.roseDeep },

  trackWrap: { marginTop: 18 },
  nudgeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  nudgeHint: { fontFamily: font.regular, fontSize: 11, color: colors.inkSoft },

  sectionLabel: { fontFamily: font.semibold, fontSize: 13, color: colors.ink, marginTop: 18, marginBottom: 9 },
  chipRow: { gap: 8, paddingBottom: 3, alignItems: 'center' },

  disclosureGroup: { marginTop: 12, gap: 8 },
  noteCard: { paddingVertical: 12 },
  noteInput: { fontFamily: font.medium, fontSize: 13.5, color: colors.ink, padding: 0 },

  banner: { marginTop: 11 },
  action: { marginTop: 16 },

  empty: { fontFamily: font.regular, fontSize: 13, color: colors.inkSoft, paddingVertical: 20, lineHeight: 19 },
  hint: { fontFamily: font.regular, fontSize: 11, color: colors.inkFaint, paddingVertical: 14 },
});
