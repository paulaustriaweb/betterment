import Svg, { Circle, Path, Rect } from 'react-native-svg';

interface IconProps {
  color: string;
  size?: number;
  strokeWidth?: number;
}

function stroke(color: string, w: number) {
  return { stroke: color, strokeWidth: w, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
}

export function HomeIcon({ color, size = 20, strokeWidth = 2.3 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color, strokeWidth)}>
      <Path d="M3 10.5 12 3l9 7.5" />
      <Path d="M5 9.5V21h14V9.5" />
      <Path d="M9 21v-6h6v6" />
    </Svg>
  );
}

export function AgendaIcon({ color, size = 20, strokeWidth = 2.3 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color, strokeWidth)}>
      <Rect x={3} y={5} width={18} height={16} rx={3} />
      <Path d="M8 3v4" />
      <Path d="M16 3v4" />
      <Path d="M3 11h18" />
    </Svg>
  );
}

export function LogIcon({ color, size = 20, strokeWidth = 2.3 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color, strokeWidth)}>
      <Path d="M12 20h9" />
      <Path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </Svg>
  );
}

export function MoneyIcon({ color, size = 20, strokeWidth = 2.3 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color, strokeWidth)}>
      <Rect x={3} y={7} width={18} height={12} rx={3} />
      <Path d="M3 11h18" />
    </Svg>
  );
}

export function GoalsIcon({ color, size = 20, strokeWidth = 2.3 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color, strokeWidth)}>
      <Circle cx={12} cy={12} r={9} />
      <Circle cx={12} cy={12} r={4.5} />
    </Svg>
  );
}

export function PlusIcon({ color, size = 18, strokeWidth = 2.6 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color, strokeWidth)}>
      <Path d="M12 5v14" />
      <Path d="M5 12h14" />
    </Svg>
  );
}

export function MinusIcon({ color, size = 18, strokeWidth = 2.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color, strokeWidth)}>
      <Path d="M5 12h14" />
    </Svg>
  );
}

export function ChevronRightIcon({ color, size = 17, strokeWidth = 2.4 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color, strokeWidth)}>
      <Path d="M9 18l6-6-6-6" />
    </Svg>
  );
}

export function ArrowRightIcon({ color, size = 15, strokeWidth = 2.4 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color, strokeWidth)}>
      <Path d="M5 12h14" />
      <Path d="M13 6l6 6-6 6" />
    </Svg>
  );
}

export function CloseIcon({ color, size = 15, strokeWidth = 2.4 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color, strokeWidth)}>
      <Path d="M18 6 6 18" />
      <Path d="m6 6 12 12" />
    </Svg>
  );
}

export function CheckIcon({ color, size = 16, strokeWidth = 2.6 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color, strokeWidth)}>
      <Path d="M20 6 9 17l-5-5" />
    </Svg>
  );
}

export function AlertIcon({ color, size = 16, strokeWidth = 2.2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color, strokeWidth)}>
      <Path d="M12 9v4" />
      <Path d="M12 17h.01" />
      <Circle cx={12} cy={12} r={9} />
    </Svg>
  );
}

export function TrashIcon({ color, size = 17, strokeWidth = 2.2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color, strokeWidth)}>
      <Path d="M3 6h18" />
      <Path d="M8 6V4h8v2" />
      <Path d="M18.5 6 17.5 20H6.5L5.5 6" />
    </Svg>
  );
}

export function BellIcon({ color, size = 16, strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color, strokeWidth)}>
      <Path d="M18 8.5a6 6 0 1 0-12 0c0 6-2.5 7.5-2.5 7.5h17S18 14.5 18 8.5" />
      <Path d="M13.7 20a2 2 0 0 1-3.4 0" />
    </Svg>
  );
}

export function NoteIcon({ color, size = 16, strokeWidth = 2.2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color, strokeWidth)}>
      <Path d="M4 7h16" />
      <Path d="M4 12h16" />
      <Path d="M4 17h9" />
    </Svg>
  );
}

export function TimelineIcon({ color, size = 16, strokeWidth = 2.2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color, strokeWidth)}>
      <Rect x={3} y={9} width={18} height={6} rx={3} />
    </Svg>
  );
}

export function GearIcon({ color, size = 16, strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color, strokeWidth)}>
      <Circle cx={12} cy={12} r={3.2} />
      <Path d="M12 2.5v2.6M12 18.9v2.6M21.5 12h-2.6M5.1 12H2.5M18.7 5.3l-1.8 1.8M7.1 16.9l-1.8 1.8M18.7 18.7l-1.8-1.8M7.1 7.1 5.3 5.3" />
    </Svg>
  );
}

export function DownloadIcon({ color, size = 16, strokeWidth = 2.2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color, strokeWidth)}>
      <Path d="M12 3v11" />
      <Path d="m7.5 10 4.5 4.5 4.5-4.5" />
      <Path d="M4 19h16" />
    </Svg>
  );
}

export function TagIcon({ color, size = 16, strokeWidth = 2.2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color, strokeWidth)}>
      <Path d="M3.5 11.4V4h7.4l9.1 9.1-7.4 7.4z" />
      <Circle cx={7.9} cy={7.9} r={1.4} />
    </Svg>
  );
}

export function EyeOffIcon({ color, size = 16, strokeWidth = 2.2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color, strokeWidth)}>
      <Path d="M4 12s3.2-5.5 8-5.5S20 12 20 12s-3.2 5.5-8 5.5S4 12 4 12Z" />
      <Path d="m4 4 16 16" />
    </Svg>
  );
}

export function EyeIcon({ color, size = 16, strokeWidth = 2.2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color, strokeWidth)}>
      <Path d="M4 12s3.2-5.5 8-5.5S20 12 20 12s-3.2 5.5-8 5.5S4 12 4 12Z" />
      <Circle cx={12} cy={12} r={2.4} />
    </Svg>
  );
}
