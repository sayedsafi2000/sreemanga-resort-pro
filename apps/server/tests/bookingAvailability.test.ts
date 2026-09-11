import { describe, expect, it } from 'vitest';
import {
  ACTIVE_BOOKING_STATUSES,
  isNightBooked,
  overlappingStayWhere,
  staysOverlap,
} from '../src/utils/bookingAvailability';

const day = (s: string) => new Date(s);
const stay = (from: string, to: string) => ({ checkInDate: day(from), checkOutDate: day(to) });

describe('staysOverlap', () => {
  it('allows same-day turnover (check in on the day another guest checks out)', () => {
    expect(staysOverlap(stay('2026-09-01', '2026-09-03'), stay('2026-09-03', '2026-09-05'))).toBe(false);
    expect(staysOverlap(stay('2026-09-03', '2026-09-05'), stay('2026-09-01', '2026-09-03'))).toBe(false);
  });

  it('detects stays that share at least one night', () => {
    expect(staysOverlap(stay('2026-09-01', '2026-09-03'), stay('2026-09-02', '2026-09-04'))).toBe(true);
    expect(staysOverlap(stay('2026-09-01', '2026-09-10'), stay('2026-09-04', '2026-09-05'))).toBe(true);
    expect(staysOverlap(stay('2026-09-01', '2026-09-03'), stay('2026-09-01', '2026-09-03'))).toBe(true);
  });

  it('is false for disjoint stays', () => {
    expect(staysOverlap(stay('2026-09-01', '2026-09-03'), stay('2026-09-10', '2026-09-12'))).toBe(false);
  });
});

describe('isNightBooked', () => {
  const booking = stay('2026-09-01', '2026-09-03');
  const noon = (s: string) => new Date(`${s}T12:00:00.000Z`);

  it('marks the check-in night and every night before checkout as booked', () => {
    expect(isNightBooked(noon('2026-09-01'), booking)).toBe(true);
    expect(isNightBooked(noon('2026-09-02'), booking)).toBe(true);
  });

  it('leaves the checkout day and days outside the stay free', () => {
    expect(isNightBooked(noon('2026-09-03'), booking)).toBe(false);
    expect(isNightBooked(noon('2026-08-31'), booking)).toBe(false);
  });
});

describe('overlappingStayWhere', () => {
  it('uses half-open bounds and only statuses that occupy a room', () => {
    expect(overlappingStayWhere(day('2026-09-01'), day('2026-09-03'))).toEqual({
      status: { in: [...ACTIVE_BOOKING_STATUSES] },
      checkInDate: { lt: day('2026-09-03') },
      checkOutDate: { gt: day('2026-09-01') },
    });
    expect(ACTIVE_BOOKING_STATUSES).toEqual(['PENDING', 'CONFIRMED', 'CHECKED_IN']);
  });
});
