/**
 * Whole amounts drop their decimals — "₱28,000" rather than "₱28,000.00".
 * Three characters of nothing is the difference between a figure that fits a
 * stat card and one that wraps mid-number.
 */
export function formatCurrency(amount: number, currencyCode: string): string {
  const hasCents = Math.round(amount * 100) % 100 !== 0;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: hasCents ? 2 : 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // The code comes from a setting the user types, so a bad one must not take
    // the whole Money screen down with it.
    return `${currencyCode} ${amount.toFixed(hasCents ? 2 : 0)}`;
  }
}

/** Whether Intl will format with this code — checked before it's saved as a setting. */
export function isValidCurrency(code: string): boolean {
  if (!/^[A-Za-z]{3}$/.test(code)) return false;
  try {
    new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).format(1);
    return true;
  } catch {
    return false;
  }
}

/** Signed form for a net figure: "+₱28,000" / "−₱40". */
export function formatSigned(amount: number, currencyCode: string): string {
  if (amount === 0) return formatCurrency(0, currencyCode);
  const sign = amount > 0 ? '+' : '−';
  return `${sign}${formatCurrency(Math.abs(amount), currencyCode)}`;
}
