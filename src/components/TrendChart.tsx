import { useState } from 'react';
import { View, type GestureResponderEvent } from 'react-native';
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import { colors, font } from '@/lib/colors';
import { monotonePath, nearestIndex, type Point } from '@/lib/curve';
import * as haptics from '@/lib/haptics';

const DEFAULT_HEIGHT = 96;
const PAD_X = 6;
const PAD_TOP = 28;
const PAD_BOTTOM = 8;

interface Props {
  /** One value per slot so far, oldest first — the line stops at today. */
  values: number[];
  /** How many slots the whole range has, so a half-done month draws half-way. */
  slots: number;
  /** What each slot is called in the scrub label ("Sep 12"). */
  labels: string[];
  format: (value: number) => string;
  height?: number;
}

/**
 * A Stocks-style trend: a smooth line that can't overshoot its data, a soft fill, a
 * dashed zero line once it dips below, and a finger to read any day by.
 */
export function TrendChart({ values, slots, labels, format, height = DEFAULT_HEIGHT }: Props) {
  const [width, setWidth] = useState(0);
  const [scrub, setScrub] = useState<number | null>(null);

  const max = Math.max(0, ...values);
  const min = Math.min(0, ...values);
  const span = max - min || 1;
  const usable = height - PAD_TOP - PAD_BOTTOM;
  const step = (width - PAD_X * 2) / Math.max(1, slots - 1);
  const x = (i: number) => PAD_X + i * step;
  const y = (v: number) => PAD_TOP + ((max - v) / span) * usable;

  const points: Point[] = values.map((v, i) => ({ x: x(i), y: y(v) }));
  const line = monotonePath(points);
  const zero = y(0);
  const last = points[points.length - 1];
  const area = last ? `${line} L${last.x},${zero} L${points[0].x},${zero} Z` : '';

  const shown = scrub ?? values.length - 1;
  const at = points[shown];
  const label = scrub === null ? format(values[shown]) : `${labels[shown]} · ${format(values[shown])}`;
  const pillWidth = Math.min(width - PAD_X * 2, label.length * 6.6 + 20);
  const pillX = at ? Math.min(width - pillWidth - PAD_X, Math.max(PAD_X, at.x - pillWidth / 2)) : 0;

  function readAt(e: GestureResponderEvent) {
    const i = nearestIndex(points.map((p) => p.x), e.nativeEvent.locationX);
    if (i !== scrub) {
      haptics.tick();
      setScrub(i);
    }
  }

  return (
    <View
      style={{ height }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={readAt}
      onResponderMove={readAt}
      onResponderRelease={() => setScrub(null)}
      onResponderTerminate={() => setScrub(null)}
      accessibilityRole="adjustable"
      accessibilityLabel={`Trend. Now ${format(values[values.length - 1] ?? 0)}. Touch and drag to read each day.`}
    >
      {width > 0 && at ? (
        <Svg width={width} height={height} pointerEvents="none">
          {min < 0 ? (
            <Line x1={PAD_X} x2={width - PAD_X} y1={zero} y2={zero} stroke="rgba(255,255,255,0.45)" strokeWidth={1} strokeDasharray="3 4" />
          ) : null}
          <Path d={area} fill="rgba(255,255,255,0.12)" />
          <Path d={line} fill="none" stroke={colors.surface} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          {scrub !== null ? (
            <Line x1={at.x} x2={at.x} y1={PAD_TOP - 4} y2={height - PAD_BOTTOM} stroke="rgba(255,255,255,0.6)" strokeWidth={1} />
          ) : null}
          <Circle cx={at.x} cy={at.y} r={7} fill="rgba(255,255,255,0.28)" />
          <Circle cx={at.x} cy={at.y} r={3.6} fill={colors.surface} />
          <Rect x={pillX} y={0} width={pillWidth} height={21} rx={10.5} fill={colors.surface} />
          <SvgText
            x={pillX + pillWidth / 2}
            y={14.5}
            textAnchor="middle"
            fontSize={11}
            fontFamily={font.bold}
            fill={colors.rose}
          >
            {label}
          </SvgText>
        </Svg>
      ) : null}
    </View>
  );
}
