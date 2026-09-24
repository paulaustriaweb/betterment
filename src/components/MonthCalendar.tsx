import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
  endOfWeek,
} from 'date-fns';
import * as haptics from '@/lib/haptics';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, font } from '@/lib/colors';
import { ChevronRightIcon } from './icons';

interface Props {
  value: Date;
  onChange: (date: Date) => void;
  /** Days before this can't be picked — a deadline in the past is a typo. */
  minDate?: Date;
  /** Days after this can't be picked — money that hasn't moved yet. */
  maxDate?: Date;
  weekStartsOn?: 0 | 1;
}

/** Month grid built from Views. No date-picker dependency, same as the bars and sparklines. */
export function MonthCalendar({ value, onChange, minDate, maxDate, weekStartsOn = 0 }: Props) {
  const [month, setMonth] = useState(() => startOfMonth(value));

  // Whole weeks, so every row has seven cells and the grid never goes ragged.
  const days = useMemo(() => {
    const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn });
    const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [month, weekStartsOn]);

  const dayLabels = useMemo(
    () => days.slice(0, 7).map((d) => format(d, 'EEEEE')),
    [days]
  );

  const floor = minDate ? startOfDay(minDate) : null;
  const ceiling = maxDate ? startOfDay(maxDate) : null;

  return (
    <View>
      <View style={styles.header}>
        <Pressable
          style={styles.nav}
          onPress={() => setMonth(addMonths(month, -1))}
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          hitSlop={8}
        >
          <View style={styles.flip}>
            <ChevronRightIcon color={colors.rose} size={16} />
          </View>
        </Pressable>

        <Text style={styles.monthLabel}>{format(month, 'MMMM yyyy')}</Text>

        <Pressable
          style={styles.nav}
          onPress={() => setMonth(addMonths(month, 1))}
          accessibilityRole="button"
          accessibilityLabel="Next month"
          hitSlop={8}
        >
          <ChevronRightIcon color={colors.rose} size={16} />
        </Pressable>
      </View>

      <View style={styles.week}>
        {dayLabels.map((label, i) => (
          <Text key={i} style={styles.weekLabel}>
            {label}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {days.map((day) => {
          const selected = isSameDay(day, value);
          const outside = !isSameMonth(day, month);
          const disabled = (floor ? isBefore(day, floor) : false) || (ceiling ? isAfter(day, ceiling) : false);
          return (
            <Pressable
              key={day.toISOString()}
              style={styles.cell}
              disabled={disabled}
              onPress={() => {
                haptics.tick();
                onChange(startOfDay(day));
              }}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled }}
              accessibilityLabel={format(day, 'EEEE, MMMM d')}
            >
              <View style={[styles.dayPill, selected && styles.dayPillSelected]}>
                <Text
                  style={[
                    styles.dayText,
                    outside && styles.dayTextOutside,
                    disabled && styles.dayTextDisabled,
                    selected && styles.dayTextSelected,
                  ]}
                >
                  {format(day, 'd')}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const CELL = `${100 / 7}%`;

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  nav: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  flip: { transform: [{ rotate: '180deg' }] },
  monthLabel: { fontFamily: font.semibold, fontSize: 14.5, color: colors.ink },

  week: { flexDirection: 'row', marginTop: 8 },
  weekLabel: {
    width: CELL,
    textAlign: 'center',
    fontFamily: font.regular,
    fontSize: 10.5,
    color: colors.inkFaint,
  },

  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  cell: { width: CELL, alignItems: 'center', paddingVertical: 3 },
  dayPill: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dayPillSelected: { backgroundColor: colors.rose },
  dayText: { fontFamily: font.medium, fontSize: 13, color: colors.ink, fontVariant: ['tabular-nums'] },
  dayTextOutside: { color: colors.inkFaint },
  dayTextDisabled: { color: '#DCC8CF' },
  dayTextSelected: { fontFamily: font.bold, color: colors.surface },
});
