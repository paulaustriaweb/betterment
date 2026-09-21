import Svg, { Circle, Polyline, Rect, Text as SvgText } from 'react-native-svg';

import { colors, font } from '@/lib/colors';

const WIDTH = 268;
const HEIGHT = 64;
const PAD_X = 5;
const PAD_TOP = 24;
const PAD_BOTTOM = 10;

interface Props {
  /** One value per point, oldest first. The last point gets the marker and label. */
  values: number[];
  label: string;
}

export function Sparkline({ values, label }: Props) {
  if (values.length < 2) return null;

  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const stepX = (WIDTH - PAD_X * 2) / (values.length - 1);
  const usableY = HEIGHT - PAD_TOP - PAD_BOTTOM;

  const points = values.map((v, i) => {
    const x = PAD_X + i * stepX;
    // higher value sits higher on the chart — more unaccounted reads as worse
    const y = PAD_TOP + usableY - ((v - min) / span) * usableY;
    return { x, y };
  });

  const last = points[points.length - 1];
  // Sized to the text — "₱18,420" overflows a fixed 58px pill.
  const pillWidth = Math.min(WIDTH - PAD_X * 2, Math.max(44, label.length * 7.2 + 18));
  const pillX = Math.min(WIDTH - pillWidth - PAD_X, Math.max(PAD_X, last.x - pillWidth / 2));

  return (
    <Svg width="100%" height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
      <Polyline
        points={points.map((p) => `${p.x},${p.y}`).join(' ')}
        fill="none"
        stroke="rgba(255,255,255,0.95)"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Rect x={pillX} y={0} width={pillWidth} height={21} rx={10} fill={colors.surface} />
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
      <Circle cx={last.x} cy={last.y} r={5.5} fill={colors.surface} />
      <Circle cx={last.x} cy={last.y} r={2.4} fill={colors.rose} />
    </Svg>
  );
}
