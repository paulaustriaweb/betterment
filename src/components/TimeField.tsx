import { format } from 'date-fns';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, font } from '@/lib/colors';
import { parseClock, type Clock } from '@/lib/timeInput';

interface Props {
  label: string;
  value: Date;
  /** Under the time: "Yesterday", "next day". */
  hint?: string;
  onCommit: (clock: Clock) => void;
  /** Flip between AM and PM — for when the guess picked the wrong half of the day. */
  onFlip: () => void;
}

/**
 * A time you type instead of drag: tap, type "730" on the number pad, done. Four
 * digits commit on their own; fewer commit when the keyboard closes. What it
 * means (which day, AM or PM) is decided by the screen, which knows the context.
 */
export function TimeField({ label, value, hint, onCommit, onFlip }: Props) {
  const [draft, setDraft] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  // Four digits commit while typing, which closes the input — and closing it can
  // fire a blur carrying the draft from a keystroke earlier. Only the first counts.
  const committed = useRef(false);
  const editing = draft !== null;

  function commit(text: string) {
    if (committed.current) return;
    committed.current = true;
    setDraft(null);
    if (!text.trim()) return;
    const clock = parseClock(text);
    if (!clock) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    onCommit(clock);
  }

  return (
    <View style={styles.box}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.timeRow}>
        {editing ? (
          <TextInput
            style={[styles.time, styles.input]}
            value={draft}
            onChangeText={(text) => {
              const digits = text.replace(/[^0-9:apmAPM ]/g, '');
              setDraft(digits);
              if (/^\d{4}$/.test(digits)) commit(digits);
            }}
            onBlur={() => commit(draft ?? '')}
            onSubmitEditing={() => commit(draft ?? '')}
            autoFocus
            keyboardType="number-pad"
            inputMode="numeric"
            returnKeyType="done"
            maxLength={7}
            placeholder="730"
            placeholderTextColor="rgba(255,255,255,0.45)"
            selectionColor={colors.surface}
            accessibilityLabel={`${label} time. Type it, like 7 30.`}
          />
        ) : (
          <Pressable
            onPress={() => {
              committed.current = false;
              setInvalid(false);
              setDraft('');
            }}
            accessibilityRole="button"
            accessibilityLabel={`${label} ${format(value, 'h:mm a')}${hint ? `, ${hint}` : ''}. Tap to type a time.`}
            hitSlop={6}
          >
            <Text style={styles.time} numberOfLines={1}>
              {format(value, 'h:mm')}
            </Text>
          </Pressable>
        )}
        <Pressable
          style={styles.meridiem}
          onPress={onFlip}
          accessibilityRole="button"
          accessibilityLabel={`Switch ${label} to ${format(value, 'a') === 'AM' ? 'PM' : 'AM'}`}
          hitSlop={6}
        >
          <Text style={styles.meridiemText}>{format(value, 'a')}</Text>
        </Pressable>
      </View>
      <Text style={[styles.hint, invalid && styles.hintError]} numberOfLines={1}>
        {invalid ? 'Type it like 730 or 1930' : editing ? 'Type the time' : hint || 'Tap to type'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 16,
    paddingVertical: 11,
    paddingHorizontal: 13,
  },
  label: { fontFamily: font.semibold, fontSize: 11.5, color: 'rgba(255,255,255,0.82)' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 4 },
  time: {
    fontFamily: font.bold,
    fontSize: 25,
    letterSpacing: -0.6,
    color: colors.surface,
    fontVariant: ['tabular-nums'],
  },
  input: { flex: 1, minWidth: 0, padding: 0, borderBottomWidth: 1.5, borderBottomColor: colors.surface },
  meridiem: { backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 9, paddingVertical: 4, paddingHorizontal: 7 },
  meridiemText: { fontFamily: font.semibold, fontSize: 11.5, color: colors.surface },
  hint: { fontFamily: font.regular, fontSize: 10.5, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  hintError: { fontFamily: font.semibold, color: colors.surface },
});
