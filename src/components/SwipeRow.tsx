import * as Haptics from 'expo-haptics';
import { useMemo, useState, type ReactNode } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, font } from '@/lib/colors';
import { TrashIcon } from './icons';

const ACTION_WIDTH = 88;
const OVERSHOOT = 20;

interface Props {
  children: ReactNode;
  onDelete: () => void;
}

/**
 * Swipe left to reveal Delete, tap to confirm. Two deliberate actions, so a
 * stray swipe can't destroy a record — and no toast infrastructure needed.
 *
 * Built on Animated + PanResponder rather than gesture-handler: this renders
 * inside a Modal, where gesture-handler needs its own root and silently stops
 * responding without one.
 */
export function SwipeRow({ children, onDelete }: Props) {
  const [translateX] = useState(() => new Animated.Value(0));
  const [open, setOpen] = useState(false);

  const responder = useMemo(
    () =>
      PanResponder.create({
        // Only claim clearly horizontal drags, so the list still scrolls vertically.
        onMoveShouldSetPanResponder: (_, g) =>
          Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onPanResponderMove: (_, g) => {
          const base = open ? -ACTION_WIDTH : 0;
          translateX.setValue(Math.min(0, Math.max(-ACTION_WIDTH - OVERSHOOT, base + g.dx)));
        },
        onPanResponderRelease: (_, g) => {
          const base = open ? -ACTION_WIDTH : 0;
          const shouldOpen = base + g.dx < -ACTION_WIDTH / 2;
          if (shouldOpen !== open) Haptics.selectionAsync();
          setOpen(shouldOpen);
          Animated.spring(translateX, {
            toValue: shouldOpen ? -ACTION_WIDTH : 0,
            useNativeDriver: true,
            bounciness: 0,
            speed: 18,
          }).start();
        },
      }),
    [open, translateX]
  );

  function confirmDelete() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onDelete();
  }

  return (
    <View style={styles.wrap}>
      <Pressable style={styles.action} onPress={confirmDelete} accessibilityRole="button" accessibilityLabel="Delete">
        <TrashIcon color={colors.surface} />
        <Text style={styles.actionLabel}>Delete</Text>
      </Pressable>

      <Animated.View style={[styles.front, { transform: [{ translateX }] }]} {...responder.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { justifyContent: 'center' },
  action: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: ACTION_WIDTH,
    backgroundColor: colors.danger,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  actionLabel: { fontFamily: font.semibold, fontSize: 11, color: colors.surface },
  front: { backgroundColor: colors.surface },
});
