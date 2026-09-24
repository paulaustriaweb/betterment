import {
  addDays,
  addHours,
  addMinutes,
  differenceInCalendarDays,
  differenceInHours,
  differenceInMinutes,
  format,
  isSameDay,
  isToday as isTodayDate,
  isYesterday,
  parseISO,
  startOfDay,
  subDays,
} from 'date-fns';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Banner } from '@/components/Banner';
import { CategoryChip } from '@/components/CategoryChip';
import { DaySwitch } from '@/components/DaySwitch';
import { DayTrack, type TrackBlock } from '@/components/DayTrack';
import { EntriesSheet } from '@/components/EntriesSheet';
import { NoteIcon, PlusIcon, TimelineIcon } from '@/components/icons';
import { RoutineChips } from '@/components/RoutineChips';
import { TimeField } from '@/components/TimeField';
import { useToast } from '@/components/Toast';
import { Card, DisclosureRow, PrimaryButton, ScreenHeader, Stepper } from '@/components/ui';
import type { TimeBlockInput } from '@/db/timeBlocks';
import { useCategories } from '@/hooks/useCategories';
import { useNow } from '@/hooks/useNow';
import { useSetting } from '@/hooks/useSettings';
import { useSubmitGuard } from '@/hooks/useSubmitGuard';
import { useLastTimeBlock, useTimeBlocksForDay, useTimeBlocksForRange } from '@/hooks/useTimeBlocks';
import { colors, font, spacing, type } from '@/lib/colors';
import { fitFontSize } from '@/lib/fit';
import { findRoutines, type Routine } from '@/lib/routines';
import { detectOverlap, formatDuration } from '@/lib/time';
import { clockAfter, clockNear, type Clock } from '@/lib/timeInput';
import type { TimeBlock } from '@/lib/types';

const STEP = 15;
const DAY = 24 * 60;
const PRESETS = [15, 30, 60, 120, 180];

function clampDuration(minutes: number): number {
  return Math.min(DAY, Math.max(STEP, minutes));
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

function dayWord(day: Date): string {
  if (isTodayDate(day)) return 'Today';
  if (isYesterday(day)) return 'Yesterday';
  return format(day, 'EEE, MMM d');
}

/** A 15-minute boundary at or before the moment — a clean default start. */
function floorToStep(moment: Date): Date {
  const d = new Date(moment);
  d.setMinutes(Math.floor(d.getMinutes() / STEP) * STEP, 0, 0);
  return d;
}

/**
 * Log is built for logging the day at night: every entry starts where the last one
 * ended — across midnight too — so the rhythm is type the end time, tap what it was,
 * save, repeat. Times are typed; the bar can still be dragged but never has to be.
 *
 * Start and end are absolute moments, not offsets from a day on screen, so an entry
 * crossing midnight can't be measured against the wrong day.
 */
export default function LogScreen() {
  const now = useNow();
  const categories = useCategories();
  const lastBlock = useLastTimeBlock();
  const [defaultDurationSetting] = useSetting('default_duration', '60');
  const defaultDuration = clampDuration(Number(defaultDurationSetting) || 60);

  // Carry on from the last entry unless it's stale or runs into the future; otherwise
  // end the new one at now.
  const defaultFrom = useMemo(() => {
    if (lastBlock) {
      const end = new Date(lastBlock.endTime);
      if (end <= now && differenceInHours(now, end) < 36) return end;
    }
    return floorToStep(addMinutes(now, -defaultDuration));
  }, [lastBlock, now, defaultDuration]);

  // null = untouched, follow the default. Data loads after the first render, so a
  // value captured at mount would miss where the last entry ended.
  const [fromChoice, setFrom] = useState<Date | null>(null);
  const [toChoice, setTo] = useState<Date | null>(null);
  const from = fromChoice ?? defaultFrom;
  const sinceFrom = differenceInMinutes(now, from);
  // Untouched, the end stops at now rather than running into the future.
  const to = toChoice ?? addMinutes(from, sinceFrom >= STEP ? Math.min(defaultDuration, sinceFrom) : defaultDuration);
  const durMin = differenceInMinutes(to, from);
  const day = startOfDay(from);
  const isToday = isSameDay(day, now);

  const { blocks, ready: blocksReady, add, update, remove } = useTimeBlocksForDay(day);
  // Overlaps can be with tomorrow's entries when this one crosses midnight.
  const { blocks: nearby } = useTimeBlocksForRange(day, addDays(day, 2));
  const recentStart = useMemo(() => subDays(startOfDay(now), 21), [now]);
  const recentEnd = useMemo(() => addDays(startOfDay(now), 1), [now]);
  const { blocks: recent } = useTimeBlocksForRange(recentStart, recentEnd);
  const routines = useMemo(() => findRoutines(recent), [recent]);

  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [noteOpen, setNoteOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [pendingEdit, setPendingEdit] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const submit = useSubmitGuard();
  const toast = useToast();

  // Arriving from Your day: a tapped gap prefills that stretch, a tapped entry opens
  // it for editing. Log is a tab and never remounts, so adjust during render when the
  // params change rather than syncing in an effect.
  const params = useLocalSearchParams<{ date?: string; n?: string; start?: string; dur?: string; edit?: string }>();
  // `n` exists so tapping the same gap twice still counts as a change.
  const paramSignature = [params.date, params.n, params.start, params.dur, params.edit].join('|');
  // Starts as null, not the current signature: tabs mount lazily, so the first tap on
  // a gap after launch is this screen's first render, and seeding with the incoming
  // params would drop them.
  const [appliedSignature, setAppliedSignature] = useState<string | null>(null);
  if (paramSignature !== appliedSignature) {
    setAppliedSignature(paramSignature);
    setEditingId(null);
    const base = parseDayParam(params.date);
    const start = finite(params.start);
    const dur = finite(params.dur);
    const edit = finite(params.edit);
    if (base && start !== null) {
      const f = addMinutes(base, Math.min(DAY - STEP, Math.max(0, start)));
      setFrom(f);
      setTo(addMinutes(f, clampDuration(dur ?? defaultDuration)));
    } else {
      // An edit is looked up in its day's entries, so point the form at that day.
      setFrom(base && edit !== null ? base : null);
      setTo(null);
    }
    setPendingEdit(edit);
  } else if (pendingEdit !== null && blocksReady) {
    // Waits for that day's entries to load — acting on the previous day's list would
    // miss the entry and silently drop the edit.
    const block = blocks.find((b) => b.id === pendingEdit);
    setPendingEdit(null);
    if (block) startEditing(block);
  }

  const overlap = useMemo(
    () => detectOverlap(nearby, from, to, editingId ?? undefined),
    [nearby, from, to, editingId]
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

  function setSpan(nextFrom: Date, nextTo: Date) {
    setFrom(nextFrom);
    setTo(nextTo);
    setNotice(null);
  }

  function commitFrom(clock: Clock) {
    const next = clockNear(clock, from);
    // Keep the end if it still makes sense after the new start.
    const keep = to > next && differenceInMinutes(to, next) <= DAY;
    setSpan(next, keep ? to : addMinutes(next, defaultDuration));
  }

  function commitTo(clock: Clock) {
    setSpan(from, clockAfter(clock, from));
  }

  function flipFrom() {
    const next = addHours(from, from.getHours() < 12 ? 12 : -12);
    const keep = to > next && differenceInMinutes(to, next) <= DAY;
    setSpan(next, keep ? to : addMinutes(next, defaultDuration));
  }

  function flipTo() {
    let next = addHours(to, to.getHours() < 12 ? 12 : -12);
    if (next <= from) next = addDays(next, 1);
    if (differenceInMinutes(next, from) > DAY) next = addDays(next, -1);
    setSpan(from, next);
  }

  function moveToDay(target: Date) {
    const shift = differenceInCalendarDays(startOfDay(target), day);
    if (shift !== 0) setSpan(addDays(from, shift), addDays(to, shift));
  }

  function applyRoutine(r: Routine) {
    const nextFrom = clockNear(r.start, from);
    setSpan(nextFrom, clockAfter(r.end, nextFrom));
    setCategoryId(r.categoryId);
  }

  /** No start given: follow the default — which carries on from the latest entry. */
  function resetForm(chainFrom?: Date) {
    setEditingId(null);
    setFrom(chainFrom ?? null);
    setTo(null);
    setCategoryId(null);
    setNote('');
    setNoteOpen(false);
  }

  function handleSave() {
    if (!categoryId) {
      setNotice('Pick a category first — what were you doing?');
      return;
    }
    if (durMin < 1 || durMin > DAY) {
      setNotice('The end has to be after the start, and within a day of it.');
      return;
    }
    const input: TimeBlockInput = {
      startTime: from.toISOString(),
      endTime: to.toISOString(),
      categoryId,
      note: note.trim() || null,
    };
    // Captured now: by the time the write resolves, the form has moved on.
    const wasEditing = editingId;
    const minutes = durMin;
    const chainFrom = to;
    submit(async () => {
      try {
        if (wasEditing) {
          await update(wasEditing, input);
          resetForm();
        } else {
          await add(input);
          // The next entry starts where this one ended.
          resetForm(chainFrom);
        }
        setNotice(null);
        toast(wasEditing ? 'Entry updated.' : `Logged ${formatDuration(minutes)}.`);
      } catch (error) {
        console.error('save failed', error);
        setNotice("Couldn't save that — try again.");
        toast("Couldn't save that — try again.", { tone: 'danger' });
      }
    });
  }

  function startEditing(block: TimeBlock) {
    setEditingId(block.id);
    setFrom(new Date(block.startTime));
    setTo(new Date(block.endTime));
    setCategoryId(block.categoryId);
    setNote(block.note ?? '');
    setNoteOpen(Boolean(block.note));
    setListOpen(false);
  }

  async function handleDelete(id: number) {
    const gone = blocks.find((b) => b.id === id);
    try {
      await remove(id);
      if (editingId === id) resetForm();
      setNotice(null);
      if (gone) {
        toast('Entry deleted.', {
          action: {
            label: 'Undo',
            onPress: () =>
              add({ startTime: gone.startTime, endTime: gone.endTime, categoryId: gone.categoryId, note: gone.note }),
          },
        });
      }
    } catch (error) {
      console.error('delete failed', error);
      setNotice("Couldn't delete that — try again.");
      // The list is in a sheet, over the inline notice — the toast is what's seen.
      toast("Couldn't delete that — try again.", { tone: 'danger' });
    }
  }

  const yesterday = subDays(startOfDay(now), 1);
  const days = [yesterday, startOfDay(now)];
  if (!days.some((d) => isSameDay(d, day))) days.unshift(day);

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ScreenHeader
          title="Add time"
          subtitle={`${editingId ? 'Editing an entry' : 'New entry'} · ${dayWord(day).toLowerCase()}`}
          right={<DaySwitch days={days} value={day} onChange={moveToDay} />}
        />

        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroLabel}>How long</Text>
              <Text
                style={[styles.heroValue, { fontSize: fitFontSize(formatDuration(Math.max(0, durMin)), 40, 8) }]}
                numberOfLines={1}
              >
                {durMin > 0 ? formatDuration(durMin) : '—'}
              </Text>
            </View>
            <View style={styles.stepperPair}>
              <Stepper
                direction="down"
                tone="onRose"
                label="15 minutes shorter"
                onPress={() => setSpan(from, addMinutes(from, clampDuration(durMin - STEP)))}
              />
              <Stepper
                direction="up"
                tone="solid"
                label="15 minutes longer"
                onPress={() => setSpan(from, addMinutes(from, clampDuration(durMin + STEP)))}
              />
            </View>
          </View>

          <View style={styles.fields}>
            <TimeField
              label="From"
              value={from}
              hint={isSameDay(from, now) ? undefined : dayWord(from)}
              onCommit={commitFrom}
              onFlip={flipFrom}
            />
            <TimeField
              label="To"
              value={to}
              hint={isSameDay(to, from) ? undefined : 'next day'}
              onCommit={commitTo}
              onFlip={flipTo}
            />
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
                  onPress={() => setSpan(from, addMinutes(from, p))}
                >
                  <Text style={[styles.presetLabel, active && styles.presetLabelActive]}>{formatDuration(p)}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Card style={styles.timeCard}>
          <DayTrack
            startMin={differenceInMinutes(from, day)}
            durMin={Math.max(STEP, durMin)}
            existing={existingOnTrack}
            onChange={(s, d) => setSpan(addMinutes(day, s), addMinutes(day, s + d))}
          />
          <View style={styles.trackRow}>
            <Text style={styles.trackHint}>Tap a time to type it · or drag the bar</Text>
            {now > from ? (
              <Pressable
                style={styles.endNow}
                onPress={() => setSpan(from, now)}
                accessibilityRole="button"
                accessibilityLabel="End this entry at the current time"
              >
                <Text style={styles.endNowLabel}>End now</Text>
              </Pressable>
            ) : null}
          </View>
        </Card>

        {editingId ? null : <RoutineChips routines={routines} categories={categories} onPick={applyRoutine} />}

        <Text style={styles.sectionLabel}>What were you doing?</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {categories
            .filter((c) => c.isActive || c.id === categoryId)
            .map((c) => (
              <CategoryChip
                key={c.id}
                category={c}
                selected={categoryId === c.id}
                onSelect={(id) => {
                  setCategoryId(id);
                  setNotice(null);
                }}
              />
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

        {notice ? (
          <View style={styles.banner}>
            <Banner message={notice} />
          </View>
        ) : overlap ? (
          <View style={styles.banner}>
            <Banner message={`This overlaps ${overlapName ?? 'another entry'}. Move it, or save anyway.`} />
          </View>
        ) : null}

        <View style={styles.action}>
          <PrimaryButton
            label={editingId ? 'Save changes' : 'Save'}
            onPress={handleSave}
            icon={<PlusIcon color={colors.surface} />}
          />
          {editingId ? (
            <Pressable style={styles.cancelEdit} onPress={() => resetForm()} accessibilityRole="button">
              <Text style={styles.cancelEditLabel}>Cancel editing</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>

      <EntriesSheet
        visible={listOpen}
        day={day}
        isToday={isToday}
        blocks={blocks}
        categories={categories}
        onClose={() => setListOpen(false)}
        onEdit={startEditing}
        onDelete={handleDelete}
      />
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
  fields: { flexDirection: 'row', gap: 9, marginTop: 14 },

  presetRow: { flexDirection: 'row', gap: 7, marginTop: 12 },
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
  trackRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, gap: 10 },
  trackHint: { flex: 1, fontFamily: font.regular, fontSize: 11, color: colors.inkSoft },
  endNow: { backgroundColor: colors.roseTint, borderRadius: 17, paddingVertical: 8, paddingHorizontal: 13 },
  endNowLabel: { fontFamily: font.semibold, fontSize: 12.5, color: colors.roseDeep },

  sectionLabel: { fontFamily: font.semibold, fontSize: 13, color: colors.ink, marginTop: 18, marginBottom: 9 },
  chipRow: { gap: 8, paddingBottom: 3, alignItems: 'center' },


  disclosureGroup: { marginTop: 12, gap: 8 },
  noteCard: { paddingVertical: 12 },
  noteInput: { fontFamily: font.medium, fontSize: 13.5, color: colors.ink, padding: 0 },

  banner: { marginTop: 11 },
  action: { marginTop: 16 },
  cancelEdit: { alignItems: 'center', paddingVertical: 12 },
  cancelEditLabel: { fontFamily: font.semibold, fontSize: 13, color: colors.inkSoft },
});
