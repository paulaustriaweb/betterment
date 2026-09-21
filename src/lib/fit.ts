/**
 * A font size that keeps `text` on one line.
 *
 * `adjustsFontSizeToFit` does this natively but react-native-web ignores it, and
 * the web build is what ships. Paired with numberOfLines={1} an over-long figure
 * is then clipped rather than shrunk — and half of a number reads as a different,
 * wrong number, which is worse than a small one.
 *
 * `fits` is how many characters sit comfortably at `base` in that slot.
 */
export function fitFontSize(text: string, base: number, fits: number, minScale = 0.55): number {
  if (text.length <= fits) return base;
  const scaled = base * (fits / text.length);
  return Math.max(base * minScale, Math.round(scaled * 10) / 10);
}
