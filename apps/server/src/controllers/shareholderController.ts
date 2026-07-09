import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { shareholderSchema } from '../validators/shareholderValidator';

// ── Shareholder CRUD ───────────────────────────────────────────────────────
export const listShareholders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { active } = req.query;
    const where: any = {};
    if (active === 'true') where.isActive = true;
    const shareholders = await prisma.shareholder.findMany({
      where,
      include: { user: { select: { id: true, email: true, role: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, shareholders });
  } catch (error) { next(error); }
};

export const getShareholder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shareholder = await prisma.shareholder.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, email: true, role: true } },
        profitShares: { include: { distribution: true }, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!shareholder) throw new AppError('Shareholder not found', 404);
    res.json({ success: true, shareholder });
  } catch (error) { next(error); }
};

export const createShareholder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = shareholderSchema.parse(req.body);
    const shareholder = await prisma.$transaction(async (tx) => {
      let userId: string | undefined;
      if (data.createLogin) {
        if (!data.email) throw new AppError('Email is required to create a login', 400);
        if (!data.password) throw new AppError('Password is required to create a login', 400);
        const existing = await tx.user.findUnique({ where: { email: data.email } });
        if (existing) throw new AppError('A user with this email already exists', 409);
        const user = await tx.user.create({
          data: {
            name: data.name,
            email: data.email,
            password: await bcrypt.hash(data.password, 10),
            role: 'SHAREHOLDER',
          },
        });
        userId = user.id;
      }
      return tx.shareholder.create({
        data: {
          userId,
          name: data.name,
          phone: data.phone,
          email: data.email ?? null,
          address: data.address ?? null,
          nid: data.nid ?? null,
          shareType: data.shareType,
          shareValue: data.shareValue,
          totalShares: data.totalShares ?? null,
          investmentAmount: data.investmentAmount ?? null,
          isActive: data.isActive ?? true,
          notes: data.notes ?? null,
        },
      });
    });
    res.status(201).json({ success: true, shareholder });
  } catch (error) { next(error); }
};

export const updateShareholder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = shareholderSchema.partial().parse(req.body);
    const existing = await prisma.shareholder.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError('Shareholder not found', 404);
    const shareholder = await prisma.shareholder.update({
      where: { id: req.params.id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.email !== undefined ? { email: data.email } : {}),
        ...(data.address !== undefined ? { address: data.address } : {}),
        ...(data.nid !== undefined ? { nid: data.nid } : {}),
        ...(data.shareType !== undefined ? { shareType: data.shareType } : {}),
        ...(data.shareValue !== undefined ? { shareValue: data.shareValue } : {}),
        ...(data.totalShares !== undefined ? { totalShares: data.totalShares } : {}),
        ...(data.investmentAmount !== undefined ? { investmentAmount: data.investmentAmount } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
      },
    });
    res.json({ success: true, shareholder });
  } catch (error) { next(error); }
};

export const deleteShareholder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.shareholder.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError('Shareholder not found', 404);
    // Deactivate to preserve distribution history.
    await prisma.shareholder.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ success: true, message: 'Shareholder deactivated' });
  } catch (error) { next(error); }
};
