import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

// Resolve the Shareholder record for the logged-in SHAREHOLDER user.
async function requireShareholder(req: Request) {
  const userId = (req as any).user?.id;
  if (!userId) throw new AppError('Unauthorized', 401);
  const shareholder = await prisma.shareholder.findUnique({ where: { userId } });
  if (!shareholder) throw new AppError('No shareholder profile linked to this account', 404);
  return shareholder;
}

export const getMyProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shareholder = await requireShareholder(req);
    res.json({ success: true, shareholder });
  } catch (error) { next(error); }
};

export const getMyProfitShares = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shareholder = await requireShareholder(req);
    const shares = await prisma.profitShare.findMany({
      where: { shareholderId: shareholder.id },
      include: { distribution: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, shares });
  } catch (error) { next(error); }
};

export const getMySummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shareholder = await requireShareholder(req);
    // Only count shares from finalized (DISTRIBUTED) distributions as "received".
    const shares = await prisma.profitShare.findMany({
      where: { shareholderId: shareholder.id },
      include: { distribution: true },
    });
    const totalReceived = shares
      .filter((s) => s.status === 'PAID')
      .reduce((sum, s) => sum + s.amount, 0);
    const pending = shares
      .filter((s) => s.status === 'PENDING' && s.distribution.status !== 'CANCELLED')
      .reduce((sum, s) => sum + s.amount, 0);

    res.json({
      success: true,
      summary: {
        name: shareholder.name,
        shareType: shareholder.shareType,
        shareValue: shareholder.shareValue,
        investmentAmount: shareholder.investmentAmount ?? 0,
        totalReceived,
        pending,
        distributionsCount: shares.length,
      },
    });
  } catch (error) { next(error); }
};
