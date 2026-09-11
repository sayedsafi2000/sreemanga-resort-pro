import { describe, expect, it } from 'vitest';
import { extractEntityId } from '../src/utils/entityId';

const ID = '3f2504e0-4f89-11d3-9a0c-0305e82c3301';

describe('extractEntityId', () => {
  it('prefers the route param when the router has filled it', () => {
    expect(extractEntityId(`/api/bookings/${ID}`, 'param-id')).toBe('param-id');
  });

  it('falls back to the first UUID in the path (mount-level middleware has no params)', () => {
    expect(extractEntityId(`/api/bookings/${ID}?include=guest`)).toBe(ID);
    expect(extractEntityId(`/api/day-long/bookings/${ID}/payments`)).toBe(ID);
  });

  it('returns null for collection routes and missing paths', () => {
    expect(extractEntityId('/api/bookings')).toBeNull();
    expect(extractEntityId(undefined)).toBeNull();
  });
});
