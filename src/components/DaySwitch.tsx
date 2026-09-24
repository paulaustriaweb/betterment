import { format, isSameDay, isToday, isYesterday } from 'date-fns';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, font } from '@/lib/colors';

/**
 * Yesterday | Today — which day an entry goes on. Logging after midnight is usually
 * about yesterday, so it's one tap away. A day that's neither gets its own option.
 */
export function DaySwitch({ days, value, onChange }: { days: Date[]; value: Date; onChange: (day: Date) => void }) {
  return (
    <View style={styles.wrap}>
      {days.map((d) => {
        const active = isSameDay(d, value);
        return (
          <Pressable
            key={d.toISOString()}
            style={[styles.option, active && styles.optionActive]}
            onPress={() => onChange(d)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`Log on ${format(d, 'EEEE, MMMM d')}`}
          >
            <Text style={[styles.label, active && styles.labelActive]}>
              {isYesterday(d) ? 'Yesterday' : isToday(d) ? 'Today' : format(d, 'MMM d')}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 18, padding: 3, gap: 2 },
  option: { borderRadius: 15, paddingVertical: 7, paddingHorizontal: 11 },
  optionActive: { backgroundColor: colors.rose },
  label: { fontFamily: font.semibold, fontSize: 12, color: colors.inkSoft },
  labelActive: { color: colors.surface },
});
