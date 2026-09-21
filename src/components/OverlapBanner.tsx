import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/lib/colors';
import { AlertIcon } from './icons';

interface Props {
  message: string;
}

export function OverlapBanner({ message }: Props) {
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
    backgroundColor: 'rgba(229,72,77,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(229,72,77,0.35)',
    borderRadius: 10,
    padding: 12,
  },
  text: { flex: 1, fontSize: 12, color: '#E8A3A6', lineHeight: 17 },
});
