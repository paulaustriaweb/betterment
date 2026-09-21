import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

import { colors, font } from '@/lib/colors';

const MINUTES_PER_DAY = 1440;
const SNAP = 5;
const MIN_DURATION = 15;
const TRACK_HEIGHT = 46;
const HANDLE_WIDTH = 26;

export interface TrackBlock {
  start: number;
  end: number;
  color: string;
}

interface Props {
  startMin: number;
  durMin: number;
  /** Already-logged blocks, drawn behind the editable one for context. */
  existing: TrackBlock[];
  onChange: (startMin: number, durMin: number) => void;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function snap(minutes: number) {
  return Math.round(minutes / SNAP) * SNAP;
}

/**
 * The day as a draggable 24h bar. Drag the block to move it, drag its right
 * edge to resize. Steppers still exist for precision — this is for speed.
 */
export function DayTrack({ startMin, durMin, existing, onChange }: Props) {
  const [width, setWidth] = useState(0);

  // The responders are created once, so everything they read lives in a ref that
  // handlers dereference at gesture time — never during render.
  const widthRef = useRef(0);
  const startRef = useRef(startMin);
  const durRef = useRef(durMin);
  const changeRef = useRef(onChange);
  const grabRef = useRef({ start: 0, dur: 0 });
  const lastHourRef = useRef(-1);

  useEffect(() => {
    startRef.current = startMin;
    durRef.current = durMin;
    changeRef.current = onChange;
  }, [startMin, durMin, onChange]);

  function onLayout(e: LayoutChangeEvent) {
    const next = e.nativeEvent.layout.width;
    widthRef.current = next;
    setWidth(next);
  }

  /* eslint-disable react-hooks/refs -- PanResponder callbacks fire from native gesture
     events, never during render, so reading refs inside them is safe. The responders must
     be created once: recreating them mid-drag would strand the grant-time baseline that
     gestureState.dx is measured against. */
  const responders = useMemo(() => {
    const pxToMinutes = (dx: number) =>
      widthRef.current ? (dx / widthRef.current) * MINUTES_PER_DAY : 0;

    /** Tick a light haptic each time the drag crosses an hour boundary. */
    const hourFeedback = (minutes: number) => {
      const hour = Math.floor(minutes / 60);
      if (hour !== lastHourRef.current) {
        lastHourRef.current = hour;
        Haptics.selectionAsync();
      }
    };

    const move = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 2,
      onPanResponderGrant: () => {
        grabRef.current = { start: startRef.current, dur: durRef.current };
        lastHourRef.current = Math.floor(startRef.current / 60);
      },
      onPanResponderMove: (_, g) => {
        const next = clamp(
          snap(grabRef.current.start + pxToMinutes(g.dx)),
          0,
          MINUTES_PER_DAY - grabRef.current.dur
        );
        hourFeedback(next);
        changeRef.current(next, grabRef.current.dur);
      },
    });

    const resize = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 2,
      onPanResponderGrant: () => {
        grabRef.current = { start: startRef.current, dur: durRef.current };
        lastHourRef.current = Math.floor((startRef.current + durRef.current) / 60);
      },
      onPanResponderMove: (_, g) => {
        const next = clamp(
          snap(grabRef.current.dur + pxToMinutes(g.dx)),
          MIN_DURATION,
          MINUTES_PER_DAY - grabRef.current.start
        );
        hourFeedback(grabRef.current.start + next);
        changeRef.current(grabRef.current.start, next);
      },
    });

    return { move: move.panHandlers, resize: resize.panHandlers };
  }, []);
  /* eslint-enable react-hooks/refs */

  const pxPerMinute = width / MINUTES_PER_DAY;
  const blockLeft = startMin * pxPerMinute;
  const blockWidth = Math.max(HANDLE_WIDTH + 4, durMin * pxPerMinute);

  return (
    <View>
      <View style={styles.track} onLayout={onLayout}>
        {width > 0 ? (
          <>
            {existing.map((b) => (
              <View
                key={`${b.start}-${b.end}`}
                style={[
                  styles.existing,
                  {
                    left: b.start * pxPerMinute,
                    width: Math.max(2, (b.end - b.start) * pxPerMinute),
                    backgroundColor: b.color,
                  },
                ]}
              />
            ))}

            {[6, 12, 18].map((h) => (
              <View key={h} style={[styles.tick, { left: h * 60 * pxPerMinute }]} />
            ))}

            <View style={[styles.block, { left: blockLeft, width: blockWidth }]} {...responders.move}>
              <View style={styles.grip} />
            </View>

            <View
              style={[styles.handle, { left: blockLeft + blockWidth - HANDLE_WIDTH / 2 }]}
              {...responders.resize}
            >
              <View style={styles.handleBar} />
            </View>
          </>
        ) : null}
      </View>

      <View style={styles.labels}>
        {/* "12a" appears at both ends, so the label can't be the key. */}
        {['12a', '6a', '12p', '6p', '12a'].map((label, i) => (
          <Text key={i} style={styles.label}>
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: TRACK_HEIGHT,
    borderRadius: 12,
    backgroundColor: colors.gap,
    justifyContent: 'center',
  },
  existing: { position: 'absolute', top: 0, bottom: 0, opacity: 0.55 },
  tick: { position: 'absolute', top: 6, bottom: 6, width: 1, backgroundColor: 'rgba(43,31,36,0.10)' },

  block: {
    position: 'absolute',
    top: -3,
    bottom: -3,
    backgroundColor: colors.rose,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grip: { width: 16, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.7)' },

  handle: {
    position: 'absolute',
    top: -10,
    bottom: -10,
    width: HANDLE_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handleBar: {
    width: 5,
    height: TRACK_HEIGHT - 6,
    borderRadius: 3,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.rose,
  },

  labels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  label: { fontFamily: font.regular, fontSize: 10, color: colors.inkSoft },
});
