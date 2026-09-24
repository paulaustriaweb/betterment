import { clockAfter, clockNear, parseClock } from '../timeInput';

describe('parseClock', () => {
  it.each([
    ['7', { hour: 7, minute: 0, meridiem: null }],
    ['730', { hour: 7, minute: 30, meridiem: null }],
    ['0730', { hour: 7, minute: 30, meridiem: 'am' }],
    ['1130', { hour: 11, minute: 30, meridiem: null }],
    ['12', { hour: 12, minute: 0, meridiem: null }],
    ['1930', { hour: 19, minute: 30, meridiem: 'pm' }],
    ['0', { hour: 0, minute: 0, meridiem: 'am' }],
    ['7:30', { hour: 7, minute: 30, meridiem: null }],
    ['7:30p', { hour: 19, minute: 30, meridiem: 'pm' }],
    ['12am', { hour: 0, minute: 0, meridiem: 'am' }],
    ['12 pm', { hour: 12, minute: 0, meridiem: 'pm' }],
    ['11 PM', { hour: 23, minute: 0, meridiem: 'pm' }],
  ])('reads %s', (text, expected) => {
    expect(parseClock(text)).toEqual(expected);
  });

  it.each(['', 'abc', '2400', '760', '13pm', '12345', '7::30'])('rejects %s', (text) => {
    expect(parseClock(text)).toBeNull();
  });
});

describe('clockAfter', () => {
  const at = (s: string) => new Date(s);

  it('lands on the next morning after a late start', () => {
    expect(clockAfter(parseClock('7')!, at('2026-09-24T23:00:00'))).toEqual(at('2026-09-25T07:00:00'));
  });

  it('picks noon, not midnight, after a morning start', () => {
    expect(clockAfter(parseClock('12')!, at('2026-09-24T07:00:00'))).toEqual(at('2026-09-24T12:00:00'));
  });

  it('picks the afternoon after a midday start', () => {
    expect(clockAfter(parseClock('5')!, at('2026-09-24T13:00:00'))).toEqual(at('2026-09-24T17:00:00'));
  });

  it('respects an explicit am/pm even if it means the next day', () => {
    expect(clockAfter(parseClock('9am')!, at('2026-09-24T10:00:00'))).toEqual(at('2026-09-25T09:00:00'));
  });

  it('is always after the start, never equal', () => {
    expect(clockAfter(parseClock('8')!, at('2026-09-24T08:00:00'))).toEqual(at('2026-09-24T20:00:00'));
  });
});

describe('clockNear', () => {
  const at = (s: string) => new Date(s);

  it('keeps a correction close to where the start already was', () => {
    expect(clockNear(parseClock('730')!, at('2026-09-24T08:00:00'))).toEqual(at('2026-09-24T07:30:00'));
  });

  it('reads an evening start near an evening default', () => {
    expect(clockNear(parseClock('10')!, at('2026-09-24T21:00:00'))).toEqual(at('2026-09-24T22:00:00'));
  });

  it('goes back to yesterday evening from just after midnight', () => {
    expect(clockNear(parseClock('11')!, at('2026-09-25T00:30:00'))).toEqual(at('2026-09-24T23:00:00'));
  });
});
