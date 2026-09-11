import { describe, expect, it, vi } from 'vitest';
import { roleCheck } from '../src/middleware/roleCheck';

function run(role: unknown, allowed: string[]) {
  const req = { user: role === undefined ? undefined : { role } } as any;
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  const next = vi.fn();
  roleCheck(allowed)(req, { status } as any, next);
  return { next, status, json };
}

describe('roleCheck', () => {
  it('lets an allowed role through', () => {
    const r = run('MANAGER', ['SUPER_ADMIN', 'MANAGER']);
    expect(r.next).toHaveBeenCalledTimes(1);
    expect(r.status).not.toHaveBeenCalled();
  });

  it('rejects a role outside the list with 403', () => {
    const r = run('SHAREHOLDER', ['SUPER_ADMIN', 'MANAGER']);
    expect(r.next).not.toHaveBeenCalled();
    expect(r.status).toHaveBeenCalledWith(403);
    expect(r.json).toHaveBeenCalledWith({ message: 'Insufficient permissions' });
  });

  it('rejects requests with no authenticated user', () => {
    const r = run(undefined, ['SUPER_ADMIN']);
    expect(r.next).not.toHaveBeenCalled();
    expect(r.status).toHaveBeenCalledWith(403);
  });

  it('tolerates whitespace around the stored role', () => {
    expect(run(' MANAGER ', ['MANAGER']).next).toHaveBeenCalledTimes(1);
  });
});
