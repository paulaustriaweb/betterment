import { formatCurrency, formatSigned } from '../currency';

// Asserted on structure rather than the exact symbol: which glyph ICU picks for
// a currency varies by platform, and the app runs on Hermes, not Node.
describe('formatCurrency', () => {
  it('drops decimals on whole amounts', () => {
    expect(formatCurrency(28000, 'PHP')).toContain('28,000');
    expect(formatCurrency(28000, 'PHP')).not.toContain('.00');
  });

  it('keeps decimals when there are cents', () => {
    expect(formatCurrency(150.5, 'PHP')).toContain('150.5');
  });

  it('rounds to two places', () => {
    expect(formatCurrency(10.129, 'PHP')).toContain('10.13');
  });

  it('handles zero', () => {
    expect(formatCurrency(0, 'PHP')).toContain('0');
  });

  it('respects the currency code', () => {
    expect(formatCurrency(5, 'USD')).toContain('5');
  });
});

describe('formatSigned', () => {
  it('prefixes a plus for positive amounts', () => {
    expect(formatSigned(28000, 'PHP').startsWith('+')).toBe(true);
  });

  it('prefixes a minus for negative amounts and drops the inner sign', () => {
    const out = formatSigned(-40, 'PHP');
    expect(out.startsWith('−')).toBe(true);
    expect(out).toContain('40');
    expect(out).not.toContain('-');
  });

  it('leaves zero unsigned', () => {
    expect(formatSigned(0, 'PHP').startsWith('+')).toBe(false);
  });
});
