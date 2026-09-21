// Design tokens — Soft Blush. Locked 2026-09-21.
// Source of truth is the "Design tokens — final" board on the UI canvas (CLAUDE.md §3).

export const colors = {
  ground: '#FBEDF1',
  surface: '#FFFFFF',
  ink: '#2B1F24',
  inkSoft: '#6B5A61',
  inkFaint: '#9E8B92',
  line: '#F5DFE6',
  rose: '#C43C6E',
  roseDeep: '#9E2A55',
  rosePop: '#F84E88',
  roseTint: '#FFE3EC',
  gap: '#F2E4E8',
  danger: '#A63232',
} as const;

// dot = bar/marker fill · fill+text = agenda blocks and category cards
export const categoryColors = {
  work: { dot: '#5271C4', fill: '#DCE4F7', text: '#2E4488' },
  study: { dot: '#8663C4', fill: '#E8DEF7', text: '#5B3A9E' },
  reading: { dot: '#4E9B77', fill: '#D9EFE3', text: '#256247' },
  sleep: { dot: '#5E6BA8', fill: '#DFE2F2', text: '#3A4680' },
  gaming: { dot: '#CE9440', fill: '#FBEBD2', text: '#7E5312' },
  scrolling: { dot: '#4C9A96', fill: '#D7EDEB', text: '#2A6B68' },
  watching: { dot: '#C97361', fill: '#FADFD9', text: '#8F3C2A' },
  other: { dot: '#93858A', fill: '#EDE7E9', text: '#5C4F54' },
} as const;

const tintByDot = new Map<string, { fill: string; text: string }>(
  Object.values(categoryColors).map((c) => [c.dot, { fill: c.fill, text: c.text }])
);

/** Agenda-block and category-card colors for a category's stored dot hex. */
export function tintFor(dotHex: string): { fill: string; text: string } {
  return tintByDot.get(dotHex) ?? { fill: categoryColors.other.fill, text: categoryColors.other.text };
}

export const radius = {
  bar: 8,
  control: 14,
  chip: 19,
  card: 24,
  pill: 27,
} as const;

export const spacing = {
  gutter: 18,
  cardGap: 10,
  sectionGap: 16,
  cardPadding: 16,
  touchTarget: 44,
} as const;

// Instrument Sans ships one family per weight — set fontFamily, not fontWeight.
export const font = {
  regular: 'InstrumentSans_400Regular',
  medium: 'InstrumentSans_500Medium',
  semibold: 'InstrumentSans_600SemiBold',
  bold: 'InstrumentSans_700Bold',
} as const;

// The six levels from the hierarchy law. No screen invents a seventh.
export const type = {
  display: { fontFamily: font.bold, fontSize: 42, letterSpacing: -1.8 },
  stat: { fontFamily: font.bold, fontSize: 25, letterSpacing: -0.9 },
  title: { fontFamily: font.bold, fontSize: 23, letterSpacing: -0.7 },
  body: { fontFamily: font.medium, fontSize: 13 },
  label: { fontFamily: font.semibold, fontSize: 11.5 },
  caption: { fontFamily: font.regular, fontSize: 10.5 },
} as const;

// Reduce Motion collapses all of these to a 120ms opacity cross-fade.
export const motion = {
  instant: 90,
  quick: 160,
  base: 240,
  sheet: 320,
} as const;

