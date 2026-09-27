import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';

import type { Column } from '@/lib/chartData';
import { colors, font, motion } from '@/lib/colors';
import * as haptics from '@/lib/haptics';
import { formatDuration } from '@/lib/time';
import type { Category } from '@/lib/types';

const HEIGHT = 92;

interface Props {
  columns: Column[];
  categories: Category[];
  /** Labels under the bars: which column, and what to say. */
  axis: { index: number; label: string }[];
  /** Drawn as a dashed line — same unit as the columns' capacity. */
  average: number | null;
  selected: number | null;
  onSelect: (index: number | null) => void;
  /** Changes when the range does, replaying the bars growing in. */
  animateKey: string;
}

/**
 * Screen Time–style stacked bars: each bar is an hour or a day, filled by what was
 * logged in it, out of its full length. The empty part of a bar is the unlogged time.
 * Touch and drag across to read any bar.
 */
export function ActivityChart({ columns, categories, axis, average, selected, onSelect, animateKey }: Props) {
  const [width, setWidth] = useState(0);
  const [grow] = useState(() => new Animated.Value(1));
  const [moved, setMoved] = useState(false);
  const [grantedOn, setGrantedOn] = useState<number | null>(null);

  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled().then(
      (reduce) => {
        if (!live) return;
        if (reduce) {
          grow.setValue(1);
          return;
        }
        grow.setValue(0);
        Animated.timing(grow, {
          toValue: 1,
          duration: motion.sheet,
          easing: Easing.bezier(0.2, 0.8, 0.2, 1),
          useNativeDriver: false,
        }).start();
      },
      () => grow.setValue(1)
    );
    return () => {
      live = false;
    };
  }, [animateKey, grow]);

  const colorOf = (id: number) => categories.find((c) => c.id === id)?.color ?? colors.inkFaint;
  const n = columns.length;
  const gap = n > 20 ? 2 : n > 10 ? 3 : 8;
  const radius = n > 20 ? 2 : 5;

  function indexAt(e: GestureResponderEvent): number {
    const x = e.nativeEvent.locationX;
    return Math.max(0, Math.min(n - 1, Math.floor((x / Math.max(1, width)) * n)));
  }

  function pick(i: number) {
    if (i !== selected && !columns[i].future) {
      haptics.tick();
      onSelect(i);
    }
  }

  const capacity = columns[0]?.capacity ?? 1;

  return (
    <View>
      <View
        style={styles.plot}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(e) => {
          setMoved(false);
          setGrantedOn(selected);
          pick(indexAt(e));
        }}
        onResponderMove={(e) => {
          setMoved(true);
          pick(indexAt(e));
        }}
        onResponderRelease={(e) => {
          // A plain tap on the bar that was already showing puts the summary back.
          if (!moved && grantedOn !== null && grantedOn === indexAt(e)) onSelect(null);
        }}
        accessibilityRole="adjustable"
        accessibilityLabel="Activity chart. Touch and drag to read each bar."
      >
        <View style={[styles.bars, { gap }]} pointerEvents="none">
          {columns.map((c, i) => {
            const dim = selected !== null && selected !== i;
            return (
              <View
                key={c.start.toISOString()}
                style={[
                  styles.track,
                  { borderRadius: radius },
                  c.future && styles.trackFuture,
                  dim && styles.dim,
                  selected === i && styles.trackSelected,
                ]}
              >
                <Animated.View
                  style={[
                    styles.fill,
                    {
                      borderRadius: radius,
                      height: grow.interpolate({ inputRange: [0, 1], outputRange: [0, (HEIGHT * c.total) / c.capacity] }),
                    },
                  ]}
                >
                  {c.segments.map((s) => (
                    <View key={s.categoryId} style={{ flex: s.minutes, backgroundColor: colorOf(s.categoryId) }} />
                  ))}
                </Animated.View>
              </View>
            );
          })}
        </View>

        {average !== null && average > 0 ? (
          <View style={[styles.average, { bottom: Math.min(HEIGHT - 1, (HEIGHT * average) / capacity) }]} pointerEvents="none">
            <Text style={styles.averageLabel}>avg {formatDuration(average)}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.axis} pointerEvents="none">
        {axis.map((a) => (
          <Text
            key={a.index}
            style={[styles.axisLabel, { left: `${((a.index + 0.5) / Math.max(1, n)) * 100}%` }]}
            numberOfLines={1}
          >
            {a.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  plot: { height: HEIGHT },
  bars: { flex: 1, flexDirection: 'row', alignItems: 'flex-end' },
  track: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(255,255,255,0.14)',
    overflow: 'hidden',
  },
  trackFuture: { backgroundColor: 'rgba(255,255,255,0.06)' },
  trackSelected: { backgroundColor: 'rgba(255,255,255,0.26)' },
  dim: { opacity: 0.4 },
  // Stacked bottom-up: the first activity sits on the floor of the bar.
  fill: { flexDirection: 'column-reverse', overflow: 'hidden' },
  average: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.75)',
  },
  averageLabel: {
    position: 'absolute',
    right: 0,
    bottom: 3,
    fontFamily: font.semibold,
    fontSize: 10,
    color: colors.surface,
    backgroundColor: colors.rose,
    paddingHorizontal: 4,
    borderRadius: 4,
    overflow: 'hidden',
    fontVariant: ['tabular-nums'],
  },
  axis: { height: 16, marginTop: 6 },
  axisLabel: {
    position: 'absolute',
    width: 40,
    marginLeft: -20,
    textAlign: 'center',
    fontFamily: font.medium,
    fontSize: 10,
    color: 'rgba(255,255,255,0.72)',
    fontVariant: ['tabular-nums'],
  },
});
