import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, font } from '@/lib/colors';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back'];

interface Props {
  value: string;
  onChange: (next: string) => void;
}

/** In-sheet keypad — the OS keyboard would cover half the sheet. */
export function AmountPad({ value, onChange }: Props) {
  function press(key: string) {
    if (key === 'back') {
      onChange(value.length <= 1 ? '0' : value.slice(0, -1));
      return;
    }
    if (key === '.') {
      if (!value.includes('.')) onChange(`${value}.`);
      return;
    }
    if (value.includes('.') && value.split('.')[1].length >= 2) return;
    if (value.replace('.', '').length >= 9) return;
    onChange(value === '0' ? key : value + key);
  }

  return (
    <View style={styles.pad}>
      {KEYS.map((key) => (
        <Pressable key={key} style={styles.key} onPress={() => press(key)}>
          {key === 'back' ? (
            <Text style={styles.backLabel}>⌫</Text>
          ) : (
            <Text style={styles.keyLabel}>{key}</Text>
          )}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  key: {
    width: '33.333%',
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyLabel: { fontFamily: font.semibold, fontSize: 23, color: colors.ink },
  backLabel: { fontFamily: font.medium, fontSize: 20, color: colors.inkSoft },
});
