import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { findMineVouchers } from './voucherController';
import { findVouchersForIdentities } from '../utils/voucher';
import { toSafeMineVoucher } from './voucherController';

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
  } catch (error) {
    next(error);
  }
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
  } catch (error) {
    next(error);
  }
};

export const getMySummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shareholder = await requireShareholder(req);
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
  } catch (error) {
    next(error);
  }
};

export const getMyVouchers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shareholder = await requireShareholder(req);
    const userId = (req as any).user?.id as string | undefined;

    let vouchers = userId
      ? await findMineVouchers(userId, shareholder.id)
      : (await findVouchersForIdentities(prisma, [{ type: 'SHAREHOLDER', id: shareholder.id }])).map(
          toSafeMineVoucher
        );

    vouchers = vouchers.filter((v: any) => {
      if (v.audienceAllShareholders) return true;
      const assignees = v.assignees || [];
      if (assignees.length > 0) {
        return assignees.some(
          (a: any) => a.assigneeType === 'SHAREHOLDER' && a.assigneeId === shareholder.id
        );
      }
      return v.assigneeType === 'SHAREHOLDER';
    });

    res.json({ success: true, vouchers });
  } catch (error) {
    next(error);
  }
};
