import { addMinutes, differenceInMinutes, format, isSameDay, parseISO, startOfDay } from 'date-fns';
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
import { useNow } from '@/hooks/useNow';
import { useLastTimeBlock, useTimeBlocksForDay } from '@/hooks/useTimeBlocks';
import { colors, font, spacing, type } from '@/lib/colors';
import type { TimeBlock } from '@/lib/types';
import { detectOverlap, formatDuration } from '@/lib/time';

const STEP = 15;
const MINUTES_PER_DAY = 24 * 60;
const PRESETS = [15, 30, 60, 120, 180];

const MAX_DURATION = 720;

function clampStart(minutes: number): number {
  return Math.min(MINUTES_PER_DAY - STEP, Math.max(0, minutes));
}

function clampDuration(minutes: number): number {
  return Math.min(MAX_DURATION, Math.max(STEP, minutes));
}

// Route params are part of the URL on the web build, so they are user input:
// a hand-edited ?start=abc must not turn into an Invalid Date and a white screen.
function finite(value: string | undefined): number | null {
  if (value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function parseDayParam(value: string | undefined): Date | null {
  if (value === undefined) return null;
  const parsed = startOfDay(parseISO(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Where the previous entry left off, if it was on this day. */
function lastBlockEndOnDay(lastBlock: TimeBlock | null, day: Date): number | null {
  if (!lastBlock) return null;
  const end = new Date(lastBlock.endTime);
  return isSameDay(end, day) ? differenceInMinutes(end, day) : null;
}

export default function LogScreen() {
  const now = useNow();
  const categories = useCategories();
  const lastBlock = useLastTimeBlock();

  // Every time on this screen is an offset from `day`, so this is what decides
  // which date an entry lands on. It is not always today — Your day can hand over
  // a past date, and writing that to today would silently corrupt both days.
  const [day, setDay] = useState(() => startOfDay(now));
  const { blocks, add, update, remove } = useTimeBlocksForDay(day);
  const isToday = isSameDay(day, now);

  const defaultStart = useMemo(() => {
    const minutes = isToday
      ? lastBlockEndOnDay(lastBlock, day) ?? differenceInMinutes(now, day)
      : // Filling a past day in after the fact: carry on from its last entry.
        blocks.reduce((max, b) => Math.max(max, differenceInMinutes(new Date(b.endTime), day)), 0);
    return clampStart(minutes);
  }, [isToday, lastBlock, blocks, now, day]);

  const [startMin, setStartMin] = useState(defaultStart);
  const [durMin, setDurMin] = useState(60);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [noteOpen, setNoteOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [pendingEdit, setPendingEdit] = useState<number | null>(null);

  // Arriving from Your day: `date` says which day to write to, a tapped gap prefills
  // that stretch, and a tapped entry opens it for editing. Log is a tab, so it never
  // remounts — adjust during render when the params change rather than syncing in an
  // effect.
  const params = useLocalSearchParams<{ date?: string; n?: string; start?: string; dur?: string; edit?: string }>();
  // `n` is why the nonce exists on the Day side: tapping the same gap twice sends
  // identical values, and without it the second tap would look like no change at
  // all — leaving the form on whatever day it had drifted to.
  const paramSignature = [params.date, params.n, params.start, params.dur, params.edit].join('|');
  // Starts as null rather than the current signature: tabs mount lazily, so the
  // first tap on a gap after launch is also this screen's first render. Seeding
  // this with the incoming params would treat them as already applied and drop
  // them — which is the original "logs to today" bug wearing a different hat.
  const [appliedSignature, setAppliedSignature] = useState<string | null>(null);
  if (paramSignature !== appliedSignature) {
    setAppliedSignature(paramSignature);
    setDay(parseDayParam(params.date) ?? startOfDay(now));
    setEditingId(null);
    const start = finite(params.start);
    const dur = finite(params.dur);
    if (start !== null) setStartMin(clampStart(start));
    if (dur !== null) setDurMin(clampDuration(dur));
    setPendingEdit(finite(params.edit));
  } else if (pendingEdit !== null) {
    // Runs on the following render, once `blocks` has been re-read for the new day.
    const block = blocks.find((b) => b.id === pendingEdit);
    setPendingEdit(null);
    if (block) startEditing(block);
  }

  const startDate = addMinutes(day, startMin);
  const endDate = addMinutes(day, startMin + durMin);

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
          start: differenceInMinutes(new Date(b.startTime), day),
          end: differenceInMinutes(new Date(b.endTime), day),
          color: categories.find((c) => c.id === b.categoryId)?.color ?? colors.inkFaint,
        })),
    [blocks, categories, day, editingId]
  );

  function setRange(nextStart: number, nextDur: number) {
    setStartMin(nextStart);
    setDurMin(nextDur);
  }

  function resetForm(nextStart: number = defaultStart) {
    setEditingId(null);
    setStartMin(clampStart(nextStart));
    setDurMin(60);
    setCategoryId(null);
    setNote('');
    setNoteOpen(false);
  }

  function goToToday() {
    const todayStart = startOfDay(now);
    setDay(todayStart);
    // defaultStart is still memoised on the old day, so pass the start explicitly.
    resetForm(differenceInMinutes(now, todayStart));
  }

  function handleSave() {
    if (!categoryId) {
      Alert.alert('Pick a category', 'Choose what you were doing.');
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

  function startEditing(block: TimeBlock) {
    const s = new Date(block.startTime);
    const e = new Date(block.endTime);
    setEditingId(block.id);
    setStartMin(clampStart(differenceInMinutes(s, day)));
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
        <ScreenHeader
          title="Add time"
          subtitle={`${editingId ? 'Editing an entry' : 'New entry'} · ${
            isToday ? 'today' : format(day, 'EEE, MMM d')
          }`}
          right={
            isToday ? undefined : (
              <Pressable
                style={styles.todayPill}
                onPress={goToToday}
                accessibilityRole="button"
                accessibilityLabel="Back to today"
              >
                <Text style={styles.todayLabel}>Today</Text>
              </Pressable>
            )
          }
        />

        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroLabel}>How long</Text>
              <Text style={styles.heroValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                {formatDuration(durMin)}
              </Text>
            </View>
            <View style={styles.stepperPair}>
              <Stepper
                direction="down"
                tone="onRose"
                label="15 minutes shorter"
                onPress={() => setDurMin(Math.max(STEP, durMin - STEP))}
              />
              <Stepper
                direction="up"
                tone="solid"
                label="15 minutes longer"
                onPress={() => setDurMin(Math.min(MAX_DURATION, durMin + STEP))}
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
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={formatDuration(p)}
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
            {isToday ? (
              <Pressable
                style={styles.endNow}
                onPress={() => setDurMin(Math.max(STEP, differenceInMinutes(new Date(), startDate)))}
                accessibilityRole="button"
                accessibilityLabel="End this entry at the current time"
              >
                <Text style={styles.endNowLabel}>End now</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.trackWrap}>
            <DayTrack startMin={startMin} durMin={durMin} existing={existingOnTrack} onChange={setRange} />
          </View>

          <View style={styles.nudgeRow}>
            <Text style={styles.nudgeHint}>Drag it, or nudge the start</Text>
            <View style={styles.stepperPairSmall}>
              <Stepper
                direction="down"
                label="Start 15 minutes earlier"
                onPress={() => setStartMin(Math.max(0, startMin - STEP))}
              />
              <Stepper
                direction="up"
                label="Start 15 minutes later"
                onPress={() => setStartMin(Math.min(MINUTES_PER_DAY - durMin, startMin + STEP))}
              />
            </View>
          </View>
        </Card>

        <Text style={styles.sectionLabel}>What were you doing?</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {categories
            .filter((c) => c.isActive || c.id === categoryId)
            .map((c) => (
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
            title={isToday ? "Today's entries" : `Entries on ${format(day, 'MMM d')}`}
            hint={blocks.length === 0 ? 'Nothing logged yet' : `${blocks.length} so far · tap to edit`}
            onPress={() => setListOpen(true)}
          />
        </View>

        {overlap ? (
          <View style={styles.banner}>
            <OverlapBanner message={`This overlaps ${overlapName ?? 'another entry'}. Move it, or save anyway.`} />
          </View>
        ) : null}

        <View style={styles.action}>
          <PrimaryButton
            label={editingId ? 'Save changes' : 'Save'}
            onPress={handleSave}
            icon={<PlusIcon color={colors.surface} />}
          />
        </View>
      </ScrollView>

      <Sheet
        visible={listOpen}
        title={isToday ? "Today's entries" : 'Entries'}
        subtitle={format(day, 'EEEE, MMM d')}
        onClose={() => setListOpen(false)}
      >
        {blocks.length === 0 ? (
          <Text style={styles.empty}>Nothing logged yet — the whole day is still empty.</Text>
        ) : (
          <>
            {blocks.map((b) => (
              <SwipeRow key={b.id} onDelete={() => handleDelete(b.id)}>
                <BlockRow
                  block={b}
                  category={categories.find((c) => c.id === b.categoryId)}
                  onPress={() => startEditing(b)}
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

  todayPill: { backgroundColor: colors.surface, borderRadius: 18, paddingVertical: 8, paddingHorizontal: 14 },
  todayLabel: { fontFamily: font.semibold, fontSize: 12.5, color: colors.rose },

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
