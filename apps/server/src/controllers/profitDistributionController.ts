import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { distributionSchema, shareOverridesSchema } from '../validators/shareholderValidator';
import { recordManualEntry } from '../utils/accountLedger';
import { emailService } from '../utils/emailService';
import { calculateCapitalShares, round2 } from '../utils/shareCapital';

const DIST_INCLUDE = {
  shares: {
    include: { shareholder: { select: { id: true, name: true, email: true, phone: true, isActive: true } } },
    orderBy: { capitalAmount: 'desc' as const },
  },
} as const;

/** Active shareholders with paid-up capital — the only ones who earn a share. */
async function activeHolders(tx: Prisma.TransactionClient) {
  const rows = await tx.shareholder.findMany({
    where: { isActive: true },
    include: { holdings: { where: { status: 'ACTIVE' }, select: { totalPrice: true } } },
  });
  return rows
    .map((r) => ({ id: r.id, capital: round2(r.holdings.reduce((s, h) => s + h.totalPrice, 0)) }))
    .filter((h) => h.capital > 0);
}

/**
 * (Re)compute every share of a DRAFT distribution from current paid-up capital.
 * Admin overrides (isManual) keep their amount; the calculated figure is still
 * refreshed next to them. Holders who dropped out lose their row.
 */
async function rebuildShares(tx: Prisma.TransactionClient, distributionId: string, totalProfit: number) {
  const holders = await activeHolders(tx);
  const { totalCapital, shares } = calculateCapitalShares(totalProfit, holders);
  const existing = await tx.profitShare.findMany({ where: { distributionId } });
  const previous = new Map(existing.map((s) => [s.shareholderId, s]));

  await tx.profitShare.deleteMany({
    where: { distributionId, shareholderId: { notIn: shares.map((s) => s.shareholderId) } },
  });
  let totalDistributed = 0;
  for (const s of shares) {
    const prev = previous.get(s.shareholderId);
    const amount = prev?.isManual ? prev.amount : s.amount;
    totalDistributed += amount;
    await tx.profitShare.upsert({
      where: { distributionId_shareholderId: { distributionId, shareholderId: s.shareholderId } },
      update: { calculatedAmount: s.amount, capitalAmount: s.capitalAmount, sharePercent: s.sharePercent, amount },
      create: {
        distributionId,
        shareholderId: s.shareholderId,
        amount: s.amount,
        calculatedAmount: s.amount,
        capitalAmount: s.capitalAmount,
        sharePercent: s.sharePercent,
      },
    });
  }
  await tx.profitDistribution.update({
    where: { id: distributionId },
    data: { totalDistributed: round2(totalDistributed), totalCapital },
  });
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
      include: DIST_INCLUDE,
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
      return tx.profitDistribution.findUnique({ where: { id: dist.id }, include: DIST_INCLUDE });
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
    const updated = await prisma.profitDistribution.findUnique({ where: { id: dist.id }, include: DIST_INCLUDE });
    res.json({ success: true, distribution: updated });
  } catch (error) { next(error); }
};

// Admin override of individual amounts (DRAFT only). amount=null clears the
// override and restores the capital-calculated figure.
export const setShareOverrides = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = shareOverridesSchema.parse(req.body);
    const dist = await prisma.profitDistribution.findUnique({ where: { id: req.params.id } });
    if (!dist) throw new AppError('Distribution not found', 404);
    if (dist.status !== 'DRAFT') throw new AppError('Only DRAFT distributions can be edited', 400);
    await prisma.$transaction(async (tx) => {
      for (const s of data.shares) {
        const row = await tx.profitShare.findUnique({
          where: { distributionId_shareholderId: { distributionId: dist.id, shareholderId: s.shareholderId } },
        });
        if (!row) continue;
        await tx.profitShare.update({
          where: { id: row.id },
          data: s.amount == null
            ? { amount: row.calculatedAmount, isManual: false }
            : { amount: round2(s.amount), isManual: true },
        });
      }
      const shares = await tx.profitShare.findMany({ where: { distributionId: dist.id } });
      await tx.profitDistribution.update({
        where: { id: dist.id },
        data: { totalDistributed: round2(shares.reduce((sum, x) => sum + x.amount, 0)) },
      });
    });
    const updated = await prisma.profitDistribution.findUnique({ where: { id: dist.id }, include: DIST_INCLUDE });
    res.json({ success: true, distribution: updated });
  } catch (error) { next(error); }
};

export const approveDistribution = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dist = await prisma.profitDistribution.findUnique({ where: { id: req.params.id } });
    if (!dist) throw new AppError('Distribution not found', 404);
    if (dist.status !== 'DRAFT') throw new AppError('Only DRAFT distributions can be approved', 400);
    const shareCount = await prisma.profitShare.count({ where: { distributionId: dist.id } });
    if (shareCount === 0) throw new AppError('No shareholder with paid-up capital — nothing to approve', 400);
    if (dist.totalDistributed > dist.totalProfit + 0.005) {
      throw new AppError('Total payout exceeds the profit being distributed — adjust the overrides first', 400);
    }
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

    // Best-effort: email each shareholder their payout. Never blocks the response.
    void notifyShareholders(result.id);

    res.json({ success: true, distribution: result });
  } catch (error) { next(error); }
};

// Fire-and-forget distribution emails to shareholders with an email on file.
async function notifyShareholders(distributionId: string) {
  try {
    const dist = await prisma.profitDistribution.findUnique({
      where: { id: distributionId },
      include: { shares: { include: { shareholder: true } } },
    });
    if (!dist) return;
    const paidDate = dist.distributionDate
      ? dist.distributionDate.toISOString().slice(0, 10)
      : undefined;
    await Promise.all(
      dist.shares
        .filter((s) => s.amount > 0 && s.shareholder.email)
        .map((s) =>
          emailService.sendProfitDistributionEmail(s.shareholder.email as string, {
            shareholderName: s.shareholder.name,
            periodLabel: dist.periodLabel,
            amount: s.amount,
            paidDate,
          })
        )
    );
  } catch {
    // Email is best-effort; swallow failures so payouts are never blocked.
  }
}

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
