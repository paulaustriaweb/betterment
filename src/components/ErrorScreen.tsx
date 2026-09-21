import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, font, radius, spacing, type } from '@/lib/colors';

/** Shown by the router's error boundary instead of a white screen with no way back. */
export function ErrorScreen({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Something broke</Text>
      <Text style={styles.body}>
        The screen crashed before it could draw. Nothing you&apos;ve logged is affected — it&apos;s all still on
        this device.
      </Text>
      <Text style={styles.detail} numberOfLines={4}>
        {error.message}
      </Text>
      <Pressable style={styles.button} onPress={retry}>
        <Text style={styles.buttonLabel}>Try again</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ground, justifyContent: 'center', paddingHorizontal: spacing.gutter },
  title: { ...type.title, color: colors.ink },
  body: { fontFamily: font.regular, fontSize: 13.5, color: colors.inkSoft, lineHeight: 20, marginTop: 10 },
  detail: {
    fontFamily: font.regular,
    fontSize: 11.5,
    color: colors.danger,
    lineHeight: 17,
    marginTop: 18,
    backgroundColor: colors.surface,
    borderRadius: radius.control,
    padding: 14,
  },
  button: {
    height: 54,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  buttonLabel: { fontFamily: font.semibold, fontSize: 15.5, color: colors.surface },
});
