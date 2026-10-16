import { AppError } from '../middleware/errorHandler';

/**
 * Local-day date helpers for reports. Every bound is a *local* midnight (the server runs
 * with TZ=Asia/Dhaka in production) and every range is half-open: [start, endExclusive).
 * Never use `new Date('YYYY-MM-DD')` here — that parses as UTC midnight.
 */

const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const pad = (n: number) => String(n).padStart(2, '0');

/** True for a real calendar date written as YYYY-MM-DD (rejects 2026-02-30). */
export function isYmd(s: unknown): s is string {
  if (typeof s !== 'string') return false;
  const m = YMD.exec(s);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(y, mo - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d;
}

/** 'YYYY-MM-DD' → local midnight of that day. Throws a 400 AppError on bad input. */
export function parseYmdLocal(ymd: string): Date {
  if (!isYmd(ymd)) throw new AppError(`Invalid date "${ymd}" — expected YYYY-MM-DD`, 400);
  const m = YMD.exec(ymd)!;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export const startOfLocalDay = parseYmdLocal;

/** Local noon of `ymd` — used for user-entered dates so viewers up to ±11h away see the same day. */
export function localNoon(ymd: string): Date {
  const d = parseYmdLocal(ymd);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);
}

/** Local midnight of the day *after* `ymd` — the exclusive upper bound for that day. */
export function nextLocalDay(ymd: string): Date {
  const d = parseYmdLocal(ymd);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
}

export function toYmdLocal(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayYmd(now: Date = new Date()): string {
  return toYmdLocal(now);
}

export function firstOfMonthYmd(ymd: string): string {
  const d = parseYmdLocal(ymd);
  return toYmdLocal(new Date(d.getFullYear(), d.getMonth(), 1));
}

export function lastOfMonthYmd(ymd: string): string {
  const d = parseYmdLocal(ymd);
  return toYmdLocal(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

export interface Period {
  from: string; // YYYY-MM-DD (inclusive)
  to: string; // YYYY-MM-DD (inclusive)
  start: Date; // local midnight of `from`
  endExclusive: Date; // local midnight of the day after `to`
}

/**
 * Query-string period parser. Defaults: nothing → 1st of the current month … today;
 * only `to` → 1st of that month … to; only `from` → from … today. `from` > `to` → 400.
 */
export function parsePeriod(from?: unknown, to?: unknown, now: Date = new Date()): Period {
  const fromGiven = typeof from === 'string' && from.trim() !== '';
  const toGiven = typeof to === 'string' && to.trim() !== '';
  if (fromGiven && !isYmd((from as string).trim())) throw new AppError(`Invalid "from" date — expected YYYY-MM-DD`, 400);
  if (toGiven && !isYmd((to as string).trim())) throw new AppError(`Invalid "to" date — expected YYYY-MM-DD`, 400);

  const toYmd = toGiven ? (to as string).trim() : todayYmd(now);
  const fromYmd = fromGiven ? (from as string).trim() : firstOfMonthYmd(toGiven ? toYmd : todayYmd(now));
  if (fromYmd > toYmd) throw new AppError('"from" must not be after "to"', 400);

  return { from: fromYmd, to: toYmd, start: parseYmdLocal(fromYmd), endExclusive: nextLocalDay(toYmd) };
}

/** True when `d` falls inside the half-open period. */
export function inPeriod(d: Date, p: Pick<Period, 'start' | 'endExclusive'>): boolean {
  const t = d.getTime();
  return t >= p.start.getTime() && t < p.endExclusive.getTime();
}

function fmtDayLabel(ymd: string): string {
  const d = parseYmdLocal(ymd);
  return `${pad(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Human label for a period: "October 2026" (whole month), "2026" (calendar year),
 * "FY 2026–27" (July–June), the same with "(to date)" when the period starts on a
 * month/year/FY boundary and ends today, otherwise "01 Oct 2026 – 15 Oct 2026".
 */
export function periodLabel(from: string, to: string, now: Date = new Date()): string {
  const f = parseYmdLocal(from);
  const t = parseYmdLocal(to);
  const fy = f.getFullYear();
  const ty = t.getFullYear();
  const toDate = to === todayYmd(now);
  if (f.getDate() === 1) {
    if (f.getMonth() === 0 && fy === ty) {
      if (t.getMonth() === 11 && t.getDate() === 31) return String(fy);
      if (toDate) return `${fy} (to date)`;
    }
    if (f.getMonth() === 6) {
      if (t.getMonth() === 5 && t.getDate() === 30 && ty === fy + 1) return `FY ${fy}–${String(fy + 1).slice(-2)}`;
      if (toDate && (ty === fy || (ty === fy + 1 && t.getMonth() <= 5))) return `FY ${fy}–${String(fy + 1).slice(-2)} (to date)`;
    }
    if (f.getMonth() === t.getMonth() && fy === ty) {
      if (lastOfMonthYmd(from) === to) return `${MONTHS_LONG[f.getMonth()]} ${fy}`;
      if (toDate) return `${MONTHS_LONG[f.getMonth()]} ${fy} (to date)`;
    }
  }
  if (from === to) return fmtDayLabel(from);
  return `${fmtDayLabel(from)} – ${fmtDayLabel(to)}`;
}
