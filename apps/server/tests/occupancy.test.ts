import { describe, expect, it } from 'vitest';
import { computeOccupancy, computeBookingTotal, DEFAULT_EXTRA_GUEST_CHARGE, MAX_EXTRA_PERSONS } from '../src/utils/bookingPricing';

describe('computeOccupancy (website booking rules)', () => {
  it('couple room: 2 adults included, nothing extra', () => {
    const o = computeOccupancy({ capacity: 2, adults: 2 });
    expect(o.ok).toBe(true); expect(o.extraPersons).toBe(0);
  });
  it('family room: 4 adults included, a 5th adult is one extra person', () => {
    const o = computeOccupancy({ capacity: 4, adults: 5 });
    expect(o.ok).toBe(true); expect(o.extraAdults).toBe(1); expect(o.extraPersons).toBe(1);
  });
  it('children 8+ count as extra persons; under-8 children are not passed and stay free', () => {
    const o = computeOccupancy({ capacity: 2, adults: 2, childrenOver8: 2 });
    expect(o.ok).toBe(true); expect(o.extraPersons).toBe(2);
  });
  it('more than two extra persons is rejected with a readable message', () => {
    const o = computeOccupancy({ capacity: 2, adults: 4, childrenOver8: 1 });
    expect(o.ok).toBe(false); expect(o.extraPersons).toBe(3); expect(o.message).toMatch(/at most 2 additional/);
    expect(MAX_EXTRA_PERSONS).toBe(2);
  });
  it('under-8 children are free but still occupy the room: capacity + 2 persons in total', () => {
    const o = computeOccupancy({ capacity: 4, adults: 4, childrenUnder8: 2 });
    expect(o.ok).toBe(true); expect(o.extraPersons).toBe(0); expect(o.totalPersons).toBe(6); expect(o.maxPersons).toBe(6);
  });
  it('too many persons in total is rejected even when none of them are chargeable', () => {
    const o = computeOccupancy({ capacity: 4, adults: 4, childrenUnder8: 3 });
    expect(o.ok).toBe(false); expect(o.extraPersons).toBe(0); expect(o.totalPersons).toBe(7);
    expect(o.message).toBe('This room holds at most 6 persons in total (4 included + 2 extra).');
  });
  it('three children aged 8+ with one adult exceed the extra-person cap (not the total cap)', () => {
    const o = computeOccupancy({ capacity: 2, adults: 1, childrenOver8: 3 });
    expect(o.ok).toBe(false); expect(o.extraPersons).toBe(3); expect(o.totalPersons).toBe(4);
    expect(o.message).toMatch(/at most 2 additional/);
  });
  it('extra persons are charged per night through computeBookingTotal', () => {
    const o = computeOccupancy({ capacity: 2, adults: 3, childrenOver8: 1 });
    const p = computeBookingTotal({ rate: 3500, nights: 2, extraPersons: o.extraPersons, extraGuestCharge: DEFAULT_EXTRA_GUEST_CHARGE });
    expect(p.extraPersonTotal).toBe(2 * 500 * 2); expect(p.total).toBe(3500 * 2 + 2000);
  });
});
