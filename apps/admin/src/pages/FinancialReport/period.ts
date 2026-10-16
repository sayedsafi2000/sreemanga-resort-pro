import { toYmd } from '@/pages/Bookings/shared';

/**
 * Period presets for the Financial Report. Every date is a local YYYY-MM-DD built with
 * toYmd (todayYmd() === toYmd(new Date())) — never `toISOString()`, which is UTC and shifts the day near midnight.
 * Open periods (this month / this year / current FY) run up to today: the balance sheet is
 * "as of" the period end and nothing is dated in the future on a cash basis.
 */

export type DateRange = { from: string; to: string };
export type PresetKey = 'this-month' | 'last-month' | 'this-year' | 'last-year' | 'fy-current' | 'fy-previous';

const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;

/** 'YYYY-MM-DD' → local midnight of that day. */
export function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** True for a real calendar date written as YYYY-MM-DD (rejects 2026-02-30). */
export function isYmd(s: string | null | undefined): s is string {
  if (!s || !YMD.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

/** "01 Oct 2026" from a YYYY-MM-DD string, parsed as a local day (fmtDate would parse it as UTC). */
export function fmtYmd(ymd: string): string {
  return isYmd(ymd) ? parseYmd(ymd).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ymd;
}

const monthRange = (year: number, month: number): DateRange => ({
  from: toYmd(new Date(year, month, 1)),
  to: toYmd(new Date(year, month + 1, 0)),
});

export const thisMonth = (now: Date = new Date()): DateRange => ({
  from: toYmd(new Date(now.getFullYear(), now.getMonth(), 1)),
  to: toYmd(now),
});
export const lastMonth = (now: Date = new Date()): DateRange => monthRange(now.getFullYear(), now.getMonth() - 1);
export const thisYear = (now: Date = new Date()): DateRange => ({ from: toYmd(new Date(now.getFullYear(), 0, 1)), to: toYmd(now) });
export const lastYear = (now: Date = new Date()): DateRange => ({
  from: toYmd(new Date(now.getFullYear() - 1, 0, 1)),
  to: toYmd(new Date(now.getFullYear() - 1, 11, 31)),
});

/** First year of the Bangladesh fiscal year (1 Jul – 30 Jun) that contains `now`, shifted by `offset`. */
export function fiscalYearStart(offset = 0, now: Date = new Date()): number {
  return (now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1) + offset;
}

/** offset 0 = the current FY (Jul 1 → today), -1 = the previous full FY (Jul 1 → Jun 30). */
export function fiscalYear(offset = 0, now: Date = new Date()): DateRange {
  const start = fiscalYearStart(offset, now);
  const end = new Date(start + 1, 5, 30);
  return { from: toYmd(new Date(start, 6, 1)), to: end < now ? toYmd(end) : toYmd(now) };
}

const fyLabel = (offset: number): string => {
  const start = fiscalYearStart(offset);
  return `FY ${start}–${String(start + 1).slice(-2)}`;
};

export const PRESETS: { key: PresetKey; label: string; range: () => DateRange }[] = [
  { key: 'this-month', label: 'This month', range: () => thisMonth() },
  { key: 'last-month', label: 'Last month', range: () => lastMonth() },
  { key: 'this-year', label: 'This year', range: () => thisYear() },
  { key: 'last-year', label: 'Last year', range: () => lastYear() },
  { key: 'fy-current', label: fyLabel(0), range: () => fiscalYear(0) },
  { key: 'fy-previous', label: fyLabel(-1), range: () => fiscalYear(-1) },
];

export function matchPreset(from: string, to: string): PresetKey | 'custom' {
  const hit = PRESETS.find((p) => {
    const r = p.range();
    return r.from === from && r.to === to;
  });
  return hit?.key ?? 'custom';
}
