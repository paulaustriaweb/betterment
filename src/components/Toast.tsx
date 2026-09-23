import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, font, motion, radius, spacing } from '@/lib/colors';
import { CloseIcon } from './icons';
import { ToastLayer } from './ToastLayer';

export interface ToastAction {
  label: string;
  /** May be async — a rejection is reported rather than swallowed. */
  onPress: () => unknown;
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

  // Undo is a write like any other. Unguarded, a failed one threw out of a press
  // handler and said nothing.
  const runAction = useCallback(
    async (action: ToastAction) => {
      dismiss();
      try {
        await action.onPress();
      } catch (error) {
        console.error(`toast action failed: ${action.label}`, error);
        show(`Couldn't ${action.label.toLowerCase()} that — try again.`, { tone: 'danger' });
      }
    },
    [dismiss, show]
  );

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast ? <ToastView key={toast.key} current={toast} onDismiss={dismiss} onAction={runAction} /> : null}
    </ToastContext.Provider>
  );
}

function ToastView({
  current,
  onDismiss,
  onAction,
}: {
  current: Current;
  onDismiss: () => void;
  onAction: (action: ToastAction) => void;
}) {
  const [slide] = useState(() => new Animated.Value(0));
  const [drag] = useState(() => new Animated.ValueXY());
  const insets = useSafeAreaInsets();
  const { message, options } = current;
  const action = options?.action;

  // Flick it sideways or up to get rid of it. Move-only, so a tap still reaches
  // Undo and the close button.
  const [swipe] = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 6 || g.dy < -6,
      onPanResponderMove: (_, g) => drag.setValue({ x: g.dx, y: Math.min(0, g.dy) }),
      onPanResponderRelease: (_, g) => {
        const sideways = Math.abs(g.dx) > 70 || Math.abs(g.vx) > 0.5;
        const upwards = g.dy < -24 || g.vy < -0.5;
        if (!sideways && !upwards) {
          Animated.spring(drag, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
          return;
        }
        Animated.timing(drag, {
          toValue: sideways ? { x: Math.sign(g.dx || g.vx) * 480, y: 0 } : { x: 0, y: -140 },
          duration: motion.quick,
          useNativeDriver: true,
        }).start(onDismiss);
      },
      onPanResponderTerminate: () =>
        Animated.spring(drag, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start(),
    })
  );

  useEffect(() => {
    Animated.timing(slide, {
      toValue: 1,
      duration: motion.base,
      useNativeDriver: true,
    }).start();
  }, [slide]);

  const danger = options?.tone === 'danger';
  const fade = drag.x.interpolate({ inputRange: [-240, 0, 240], outputRange: [0, 1, 0], extrapolate: 'clamp' });

  return (
    // At the top, clear of the primary action at the bottom of every screen, so the
    // next thing can be done while this is still showing.
    <ToastLayer>
      <Animated.View
        {...swipe.panHandlers}
        style={[
          styles.toast,
          danger && styles.toastDanger,
          {
            marginTop: insets.top + 10,
            opacity: Animated.multiply(slide, fade),
            transform: [
              { translateX: drag.x },
              { translateY: Animated.add(slide.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }), drag.y) },
            ],
          },
        ]}
      >
        <Text style={styles.message} numberOfLines={2} accessibilityLiveRegion="polite">
          {message}
        </Text>
        {action ? (
          <Pressable
            onPress={() => onAction(action)}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            style={styles.action}
            hitSlop={8}
          >
            <Text style={styles.actionLabel}>{action.label}</Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          style={styles.close}
          hitSlop={10}
        >
          <CloseIcon color="rgba(255,255,255,0.75)" size={14} />
        </Pressable>
      </Animated.View>
    </ToastLayer>
  );
}

const styles = StyleSheet.create({
  toast: {
    marginHorizontal: spacing.gutter,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.ink,
    borderRadius: radius.control + 4,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  toastDanger: { backgroundColor: colors.danger },
  message: { flex: 1, fontFamily: font.medium, fontSize: 13, color: colors.surface, lineHeight: 18 },
  action: { paddingVertical: 2 },
  actionLabel: { fontFamily: font.bold, fontSize: 13, color: colors.rosePop },
  close: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -6,
  },
});
