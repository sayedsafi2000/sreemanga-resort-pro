import { describe, expect, it } from 'vitest';
import {
  inPeriod,
  isYmd,
  nextLocalDay,
  parsePeriod,
  parseYmdLocal,
  periodLabel,
  toYmdLocal,
} from '../src/utils/dateRange';

const NOW = new Date(2026, 9, 16, 14, 30); // 16 Oct 2026, 14:30 local

describe('isYmd / parseYmdLocal', () => {
  it('accepts real calendar dates only', () => {
    expect(isYmd('2026-10-16')).toBe(true);
    expect(isYmd('2026-02-29')).toBe(false); // 2026 is not a leap year
    expect(isYmd('2026-1-5')).toBe(false);
    expect(isYmd('16/10/2026')).toBe(false);
    expect(isYmd(undefined)).toBe(false);
  });
  it('parses to local midnight and round-trips', () => {
    const d = parseYmdLocal('2026-10-16');
    expect([d.getHours(), d.getMinutes()]).toEqual([0, 0]);
    expect(toYmdLocal(d)).toBe('2026-10-16');
  });
  it('throws a 400 on bad input', () => {
    expect(() => parseYmdLocal('nope')).toThrowError(/YYYY-MM-DD/);
    try { parseYmdLocal('2026-13-01'); } catch (e: any) { expect(e.statusCode).toBe(400); }
  });
  it('nextLocalDay is the exclusive end of the day', () => {
    const start = parseYmdLocal('2026-10-16');
    const end = nextLocalDay('2026-10-16');
    expect(toYmdLocal(end)).toBe('2026-10-17');
    expect(end.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000);
  });
});

describe('parsePeriod', () => {
  it('defaults to the current month so far', () => {
    const p = parsePeriod(undefined, undefined, NOW);
    expect([p.from, p.to]).toEqual(['2026-10-01', '2026-10-16']);
    expect(toYmdLocal(p.start)).toBe('2026-10-01');
    expect(toYmdLocal(p.endExclusive)).toBe('2026-10-17');
  });
  it('fills the missing bound sensibly', () => {
    expect(parsePeriod(undefined, '2026-08-20', NOW).from).toBe('2026-08-01');
    expect(parsePeriod('2026-10-05', undefined, NOW).to).toBe('2026-10-16');
    expect(parsePeriod('', '', NOW).from).toBe('2026-10-01');
  });
  it('rejects reversed or malformed ranges with 400', () => {
    for (const [f, t] of [['2026-10-20', '2026-10-01'], ['2026/10/01', '2026-10-05'], ['2026-10-01', 'x']]) {
      try {
        parsePeriod(f, t, NOW);
        throw new Error('expected throw');
      } catch (e: any) {
        expect(e.statusCode).toBe(400);
      }
    }
  });
  it('inPeriod is start-inclusive and end-exclusive', () => {
    const p = parsePeriod('2026-10-01', '2026-10-15', NOW);
    expect(inPeriod(new Date(2026, 9, 1, 0, 0, 0), p)).toBe(true);
    expect(inPeriod(new Date(2026, 9, 15, 23, 59, 59), p)).toBe(true);
    expect(inPeriod(new Date(2026, 9, 16, 0, 0, 0), p)).toBe(false);
    expect(inPeriod(new Date(2026, 8, 30, 23, 59, 59), p)).toBe(false);
  });
});

describe('periodLabel', () => {
  it('names months, years, fiscal years and custom ranges', () => {
    expect(periodLabel('2026-10-01', '2026-10-31')).toBe('October 2026');
    expect(periodLabel('2026-02-01', '2026-02-28')).toBe('February 2026');
    expect(periodLabel('2026-01-01', '2026-12-31')).toBe('2026');
    expect(periodLabel('2026-07-01', '2027-06-30')).toBe('FY 2026–27');
    expect(periodLabel('2026-10-01', '2026-10-15')).toBe('01 Oct 2026 – 15 Oct 2026');
    expect(periodLabel('2026-10-15', '2026-10-15')).toBe('15 Oct 2026');
  });
  it('marks open periods that end today as "(to date)"', () => {
    expect(periodLabel('2026-10-01', '2026-10-16', NOW)).toBe('October 2026 (to date)');
    expect(periodLabel('2026-01-01', '2026-10-16', NOW)).toBe('2026 (to date)');
    expect(periodLabel('2026-07-01', '2026-10-16', NOW)).toBe('FY 2026–27 (to date)');
    expect(periodLabel('2026-10-01', '2026-10-15', NOW)).toBe('01 Oct 2026 – 15 Oct 2026');
  });
});
