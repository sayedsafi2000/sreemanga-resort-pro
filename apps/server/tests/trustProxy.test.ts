import { describe, expect, it } from 'vitest';
import { parseTrustProxy } from '../src/utils/trustProxy';

describe('parseTrustProxy', () => {
  it('defaults to one proxy hop in production and none in development', () => {
    expect(parseTrustProxy(undefined, true)).toBe(1);
    expect(parseTrustProxy('', true)).toBe(1);
    expect(parseTrustProxy(undefined, false)).toBe(false);
  });

  it('parses booleans and hop counts', () => {
    expect(parseTrustProxy('true', false)).toBe(true);
    expect(parseTrustProxy('false', true)).toBe(false);
    expect(parseTrustProxy('0', true)).toBe(false);
    expect(parseTrustProxy('2', false)).toBe(2);
  });

  it('passes Express string forms through', () => {
    expect(parseTrustProxy('loopback', true)).toBe('loopback');
    expect(parseTrustProxy('10.0.0.0/8, 172.16.0.0/12', true)).toBe('10.0.0.0/8, 172.16.0.0/12');
  });
});
