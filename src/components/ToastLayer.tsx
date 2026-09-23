import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { FullWindowOverlay } from 'react-native-screens';

/**
 * Not a Modal: a Modal takes every touch on the screen while it is up. The overlay
 * floats above sheets (iOS) and box-none lets taps through everywhere the toast isn't.
 */
export function ToastLayer({ children }: { children: ReactNode }) {
  return (
    <FullWindowOverlay>
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {children}
      </View>
    </FullWindowOverlay>
  );
}
