import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';

/**
 * Audit middleware — records successful mutations (non-GET, 2xx) fire-and-forget.
 * Attach per route group: audit('Booking'). Action is inferred from the HTTP
 * method unless overridden.
 */
const METHOD_ACTION: Record<string, string> = {
  POST: 'CREATE', PUT: 'UPDATE', PATCH: 'UPDATE', DELETE: 'DELETE',
};

export function audit(entity: string, actionOverride?: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'GET') return next();

    res.on('finish', () => {
      if (res.statusCode < 200 || res.statusCode >= 300) return;
      const user = (req as any).user;
      const action = actionOverride || METHOD_ACTION[req.method] || req.method;
      prisma.auditLog
        .create({
          data: {
            userId: user?.id ?? null,
            userName: user?.name ?? null,
            userRole: user?.role ?? null,
            action,
            entity,
            entityId: req.params?.id ?? null,
            method: req.method,
            path: req.originalUrl?.split('?')[0] ?? null,
            ipAddress: req.ip ?? null,
            userAgent: req.headers['user-agent'] ?? null,
          },
        })
        .catch((err) => console.error('[AuditLog] failed:', err));
    });

    next();
  };
}
