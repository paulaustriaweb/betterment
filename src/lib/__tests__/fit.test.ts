import { fitFontSize } from '../fit';

describe('fitFontSize', () => {
  it('leaves short text at the base size', () => {
    expect(fitFontSize('7h 00m', 48, 8)).toBe(48);
    expect(fitFontSize('12345678', 48, 8)).toBe(48);
  });

  it('shrinks text that overruns the slot', () => {
    expect(fitFontSize('−₱1,234,567', 44, 9)).toBeLessThan(44);
  });

  it('shrinks further the longer the text gets', () => {
    const shorter = fitFontSize('₱100,000', 44, 6);
    const longer = fitFontSize('₱100,000,000', 44, 6);
    expect(longer).toBeLessThan(shorter);
  });

  it('never goes below the floor', () => {
    const tiny = fitFontSize('x'.repeat(500), 40, 8);
    expect(tiny).toBe(40 * 0.55);
  });

  it('handles empty text', () => {
    expect(fitFontSize('', 40, 8)).toBe(40);
  });
});
