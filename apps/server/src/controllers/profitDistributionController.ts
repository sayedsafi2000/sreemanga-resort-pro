import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { distributionSchema, customSharesSchema } from '../validators/shareholderValidator';
import { recordManualEntry } from '../utils/accountLedger';

type ShareholderLite = {
  id: string;
  shareType: 'PERCENTAGE' | 'FIXED' | 'CUSTOM';
  shareValue: number;
  isActive: boolean;
};

// Compute each active shareholder's cut of a distribution.
// PERCENTAGE: proportional to shareValue among percentage holders, applied to
//   the pool remaining after FIXED payouts. FIXED: flat shareValue. CUSTOM: 0
//   (admin sets manually).
export function calculateProfitShares(
  totalProfit: number,
  shareholders: ShareholderLite[]
): { shareholderId: string; amount: number }[] {
  const active = shareholders.filter((s) => s.isActive);
  const fixedTotal = active.filter((s) => s.shareType === 'FIXED').reduce((sum, s) => sum + s.shareValue, 0);
  const pctPool = Math.max(0, totalProfit - fixedTotal);
  const pctSum = active.filter((s) => s.shareType === 'PERCENTAGE').reduce((sum, s) => sum + s.shareValue, 0);

  return active.map((s) => {
    if (s.shareType === 'FIXED') return { shareholderId: s.id, amount: s.shareValue };
    if (s.shareType === 'PERCENTAGE') {
      const amount = pctSum > 0 ? (s.shareValue / pctSum) * pctPool : 0;
      return { shareholderId: s.id, amount: Math.round(amount * 100) / 100 };
    }
    return { shareholderId: s.id, amount: 0 }; // CUSTOM
  });
}

async function rebuildShares(tx: Prisma.TransactionClient, distributionId: string, totalProfit: number) {
  const shareholders = await tx.shareholder.findMany({ where: { isActive: true } });
  const calc = calculateProfitShares(totalProfit, shareholders as ShareholderLite[]);
  await tx.profitShare.deleteMany({ where: { distributionId } });
  if (calc.length > 0) {
    await tx.profitShare.createMany({
      data: calc.map((c) => ({ distributionId, shareholderId: c.shareholderId, amount: c.amount })),
    });
  }
  const totalDistributed = calc.reduce((s, c) => s + c.amount, 0);
  await tx.profitDistribution.update({ where: { id: distributionId }, data: { totalDistributed } });
}

export const listDistributions = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const distributions = await prisma.profitDistribution.findMany({
      include: { _count: { select: { shares: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, distributions });
  } catch (error) { next(error); }
};

export const getDistribution = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const distribution = await prisma.profitDistribution.findUnique({
      where: { id: req.params.id },
      include: { shares: { include: { shareholder: true }, orderBy: { amount: 'desc' } } },
    });
    if (!distribution) throw new AppError('Distribution not found', 404);
    res.json({ success: true, distribution });
  } catch (error) { next(error); }
};

export const createDistribution = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = distributionSchema.parse(req.body);
    const distribution = await prisma.$transaction(async (tx) => {
      const dist = await tx.profitDistribution.create({
        data: {
          periodLabel: data.periodLabel,
          periodStart: new Date(data.periodStart),
          periodEnd: new Date(data.periodEnd),
          totalProfit: data.totalProfit,
          notes: data.notes ?? null,
          status: 'DRAFT',
          createdById: (req as any).user?.id,
        },
      });
      await rebuildShares(tx, dist.id, data.totalProfit);
      return tx.profitDistribution.findUnique({ where: { id: dist.id }, include: { shares: { include: { shareholder: true } } } });
    });
    res.status(201).json({ success: true, distribution });
  } catch (error) { next(error); }
};

export const recalcDistribution = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dist = await prisma.profitDistribution.findUnique({ where: { id: req.params.id } });
    if (!dist) throw new AppError('Distribution not found', 404);
    if (dist.status !== 'DRAFT') throw new AppError('Only DRAFT distributions can be recalculated', 400);
    await prisma.$transaction((tx) => rebuildShares(tx, dist.id, dist.totalProfit));
    const updated = await prisma.profitDistribution.findUnique({ where: { id: dist.id }, include: { shares: { include: { shareholder: true } } } });
    res.json({ success: true, distribution: updated });
  } catch (error) { next(error); }
};

// Set CUSTOM shareholders' amounts manually (DRAFT only).
export const setCustomShares = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = customSharesSchema.parse(req.body);
    const dist = await prisma.profitDistribution.findUnique({ where: { id: req.params.id } });
    if (!dist) throw new AppError('Distribution not found', 404);
    if (dist.status !== 'DRAFT') throw new AppError('Only DRAFT distributions can be edited', 400);
    await prisma.$transaction(async (tx) => {
      for (const s of data.shares) {
        await tx.profitShare.updateMany({
          where: { distributionId: dist.id, shareholderId: s.shareholderId },
          data: { amount: s.amount },
        });
      }
      const shares = await tx.profitShare.findMany({ where: { distributionId: dist.id } });
      await tx.profitDistribution.update({
        where: { id: dist.id },
        data: { totalDistributed: shares.reduce((sum, x) => sum + x.amount, 0) },
      });
    });
    const updated = await prisma.profitDistribution.findUnique({ where: { id: dist.id }, include: { shares: { include: { shareholder: true } } } });
    res.json({ success: true, distribution: updated });
  } catch (error) { next(error); }
};

export const approveDistribution = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dist = await prisma.profitDistribution.findUnique({ where: { id: req.params.id } });
    if (!dist) throw new AppError('Distribution not found', 404);
    if (dist.status !== 'DRAFT') throw new AppError('Only DRAFT distributions can be approved', 400);
    const updated = await prisma.profitDistribution.update({ where: { id: dist.id }, data: { status: 'APPROVED' } });
    res.json({ success: true, distribution: updated });
  } catch (error) { next(error); }
};

// Mark all shares PAID + post an equity/cash OUT ledger entry for the payout.
export const distributeDistribution = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const dist = await tx.profitDistribution.findUnique({ where: { id: req.params.id }, include: { shares: true } });
      if (!dist) throw new AppError('Distribution not found', 404);
      if (dist.status !== 'APPROVED') throw new AppError('Only APPROVED distributions can be distributed', 400);

      await tx.profitShare.updateMany({
        where: { distributionId: dist.id, status: 'PENDING' },
        data: { status: 'PAID', paidDate: new Date() },
      });
      const updated = await tx.profitDistribution.update({
        where: { id: dist.id },
        data: { status: 'DISTRIBUTED', distributionDate: new Date() },
      });

      // Ledger: cash OUT of the payout total (retained earnings drawn down).
      const cash = await tx.account.findUnique({ where: { code: '1001' } });
      if (cash && dist.totalDistributed > 0) {
        await recordManualEntry(tx, {
          accountId: cash.id,
          direction: 'OUT',
          amount: dist.totalDistributed,
          description: `Profit distribution - ${dist.periodLabel}`,
          createdById: (req as any).user?.id,
        });
      }
      return updated;
    });
    res.json({ success: true, distribution: result });
  } catch (error) { next(error); }
};

export const cancelDistribution = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dist = await prisma.profitDistribution.findUnique({ where: { id: req.params.id } });
    if (!dist) throw new AppError('Distribution not found', 404);
    if (dist.status === 'DISTRIBUTED') throw new AppError('Cannot cancel a distributed payout', 400);
    await prisma.$transaction(async (tx) => {
      await tx.profitShare.updateMany({ where: { distributionId: dist.id }, data: { status: 'CANCELLED' } });
      await tx.profitDistribution.update({ where: { id: dist.id }, data: { status: 'CANCELLED' } });
    });
    res.json({ success: true, message: 'Distribution cancelled' });
  } catch (error) { next(error); }
};
