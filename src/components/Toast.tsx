import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, font, motion, radius, spacing } from '@/lib/colors';

export interface ToastAction {
  label: string;
  onPress: () => void;
}

interface ToastOptions {
  /** Shown as a button on the right — "Undo" after something was removed. */
  action?: ToastAction;
  tone?: 'default' | 'danger';
  durationMs?: number;
}

type Show = (message: string, options?: ToastOptions) => void;

const ToastContext = createContext<Show>(() => {});

/** Every action worth confirming calls this; it disappears on its own. */
export function useToast(): Show {
  return useContext(ToastContext);
}

interface Current {
  key: number;
  message: string;
  options?: ToastOptions;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Current | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextKey = useRef(0);

  const dismiss = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setToast(null);
  }, []);

  const show = useCallback<Show>((message, options) => {
    if (timer.current) clearTimeout(timer.current);
    nextKey.current += 1;
    setToast({ key: nextKey.current, message, options });
    // Longer for anything with an action — Undo is useless if it's gone already.
    const ms = options?.durationMs ?? (options?.action ? 6000 : 3200);
    timer.current = setTimeout(() => setToast(null), ms);
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast ? <ToastView key={toast.key} current={toast} onDismiss={dismiss} /> : null}
    </ToastContext.Provider>
  );
}

function ToastView({ current, onDismiss }: { current: Current; onDismiss: () => void }) {
  const [slide] = useState(() => new Animated.Value(0));
  const { message, options } = current;

  useEffect(() => {
    Animated.timing(slide, {
      toValue: 1,
      duration: motion.base,
      useNativeDriver: true,
    }).start();
  }, [slide]);

  const danger = options?.tone === 'danger';

  return (
    // Its own Modal so it floats above the sheets — most of what it reports
    // happens inside one, and anything in the app tree renders behind them.
    <Modal transparent visible animationType="none" onRequestClose={onDismiss}>
      <View style={styles.layer} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.toast,
            danger && styles.toastDanger,
            {
              opacity: slide,
              transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
            },
          ]}
        >
          <Text style={styles.message} numberOfLines={2}>
            {message}
          </Text>
          {options?.action ? (
            <Pressable
              onPress={() => {
                options.action?.onPress();
                onDismiss();
              }}
              accessibilityRole="button"
              accessibilityLabel={options.action.label}
              style={styles.action}
              hitSlop={8}
            >
              <Text style={styles.actionLabel}>{options.action.label}</Text>
            </Pressable>
          ) : (
            <Pressable onPress={onDismiss} accessibilityRole="button" accessibilityLabel="Dismiss" hitSlop={8}>
              <Text style={styles.dismiss}>Close</Text>
            </Pressable>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  layer: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: spacing.gutter, paddingBottom: 104 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.ink,
    borderRadius: radius.control + 4,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  toastDanger: { backgroundColor: colors.danger },
  message: { flex: 1, fontFamily: font.medium, fontSize: 13, color: colors.surface, lineHeight: 18 },
  action: { paddingVertical: 2 },
  actionLabel: { fontFamily: font.bold, fontSize: 13, color: colors.rosePop },
  dismiss: { fontFamily: font.semibold, fontSize: 12.5, color: 'rgba(255,255,255,0.65)' },
});
