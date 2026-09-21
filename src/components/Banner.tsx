import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/lib/colors';
import { AlertIcon } from './icons';

/**
 * Inline feedback, because Alert.alert is a no-op on react-native-web and the
 * web build is what ships — an alert there is a button that does nothing.
 */
export function Banner({ message }: { message: string }) {
  return (
    <View style={styles.wrap}>
      <AlertIcon color={colors.danger} size={16} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    backgroundColor: '#FBE4E4',
    borderWidth: 1,
    borderColor: '#EFC2C2',
    borderRadius: 10,
    padding: 12,
  },
  text: { flex: 1, fontSize: 12, color: colors.danger, lineHeight: 17 },
});
