import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';

export const listAuditLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { entity, action, userId, from, to } = req.query;
    const where: any = {};
    if (entity) where.entity = entity;
    if (action) where.action = action;
    if (userId) where.userId = userId;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(String(from));
      if (to) { const e = new Date(String(to)); e.setHours(23,59,59,999); where.createdAt.lte = e; }
    }
    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    res.json({ success: true, logs });
  } catch (error) { next(error); }
};
