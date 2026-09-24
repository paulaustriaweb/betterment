import { backupDue } from '../backupDue';

const at = (s: string) => new Date(s);

describe('backupDue', () => {
  it('never nags before anything is logged', () => {
    expect(backupDue(null, null, at('2026-09-30T12:00:00'))).toBe(false);
  });

  it('waits a few days before the first one', () => {
    expect(backupDue(null, at('2026-09-24T09:00:00'), at('2026-09-26T12:00:00'))).toBe(false);
    expect(backupDue(null, at('2026-09-24T09:00:00'), at('2026-09-27T12:00:00'))).toBe(true);
  });

  it('is due a week after the last backup', () => {
    const start = at('2026-09-01T09:00:00');
    expect(backupDue(at('2026-09-20T09:00:00'), start, at('2026-09-26T09:00:00'))).toBe(false);
    expect(backupDue(at('2026-09-20T09:00:00'), start, at('2026-09-27T09:00:00'))).toBe(true);
  });
});
