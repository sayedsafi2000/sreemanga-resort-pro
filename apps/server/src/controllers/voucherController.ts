import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import {
  voucherCreateSchema,
  voucherUpdateSchema,
  voucherValidateSchema,
} from '../validators/voucherValidator';
import {
  codeHintFrom,
  generateVoucherCode,
  hashVoucherCode,
  normalizeCode,
  validateVoucherForCheckout,
} from '../utils/voucher';

function serializeVoucher(v: any, plaintextCode?: string) {
  const { codeHash: _h, ...rest } = v;
  return {
    ...rest,
    ...(plaintextCode ? { code: plaintextCode } : {}),
    redemptionCount: v._count?.redemptions ?? v.redemptions?.length ?? undefined,
  };
}

async function createOneVoucher(
  tx: any,
  data: ReturnType<typeof voucherCreateSchema.parse>,
  code: string,
  createdById?: string
) {
  const normalized = normalizeCode(code);
  const codeHash = hashVoucherCode(normalized);
  const existing = await tx.voucher.findUnique({ where: { codeHash } });
  if (existing) throw new AppError(`Code ${normalized} already exists`, 409);

  if (data.assigneeType !== 'NONE' && !data.assigneeId) {
    throw new AppError('assigneeId is required when assigneeType is set', 400);
  }
  if (data.scope === 'SELECTED_ITEMS' && (!data.items || data.items.length === 0)) {
    throw new AppError('Select at least one item for SELECTED_ITEMS scope', 400);
  }
  if (data.discountType === 'PERCENT' && data.discountValue > 100) {
    throw new AppError('Percentage cannot exceed 100', 400);
  }

  return tx.voucher.create({
    data: {
      codeHash,
      codeHint: codeHintFrom(normalized),
      name: data.name,
      description: data.description ?? null,
      discountType: data.discountType,
      discountValue: data.discountValue,
      scope: data.scope,
      appliesRoom: data.appliesRoom,
      appliesDayLong: data.appliesDayLong,
      appliesRestaurant: data.appliesRestaurant,
      minSpend: data.minSpend ?? null,
      maxDiscountAmount: data.maxDiscountAmount ?? null,
      startsAt: data.startsAt ? new Date(data.startsAt) : null,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      maxRedemptions: data.maxRedemptions ?? null,
      maxPerAssignee: data.maxPerAssignee ?? null,
      isSecure: data.isSecure,
      assigneeType: data.assigneeType,
      assigneeId: data.assigneeType === 'NONE' ? null : data.assigneeId ?? null,
      createdById: createdById ?? null,
      items:
        data.scope === 'SELECTED_ITEMS' && data.items?.length
          ? {
              create: data.items.map((i) => ({
                itemType: i.itemType,
                itemId: i.itemId,
              })),
            }
          : undefined,
    },
    include: { items: true, _count: { select: { redemptions: true } } },
  });
}

export const listVouchers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { active, q } = req.query;
    const where: any = {};
    if (active === 'true') where.isActive = true;
    if (active === 'false') where.isActive = false;
    if (typeof q === 'string' && q.trim()) {
      where.OR = [
        { name: { contains: q.trim(), mode: 'insensitive' } },
        { codeHint: { contains: q.trim().toUpperCase() } },
      ];
    }
    const vouchers = await prisma.voucher.findMany({
      where,
      include: { items: true, _count: { select: { redemptions: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({
      success: true,
      vouchers: vouchers.map((v) => serializeVoucher(v)),
    });
  } catch (error) {
    next(error);
  }
};

export const getVoucher = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const voucher = await prisma.voucher.findUnique({
      where: { id: req.params.id },
      include: {
        items: true,
        redemptions: { orderBy: { createdAt: 'desc' }, take: 50 },
        _count: { select: { redemptions: true } },
      },
    });
    if (!voucher) throw new AppError('Voucher not found', 404);
    res.json({ success: true, voucher: serializeVoucher(voucher) });
  } catch (error) {
    next(error);
  }
};

export const createVoucher = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = voucherCreateSchema.parse(req.body);
    const bulk = data.bulkCount && data.bulkCount > 1 ? data.bulkCount : 1;
    const createdById = req.user?.id;

    const result = await prisma.$transaction(async (tx) => {
      const created: { voucher: any; code: string }[] = [];
      for (let i = 0; i < bulk; i++) {
        const code = bulk === 1 && data.code ? normalizeCode(data.code) : generateVoucherCode();
        const voucher = await createOneVoucher(tx, data, code, createdById);
        created.push({ voucher, code });
      }
      return created;
    });

    if (result.length === 1) {
      res.status(201).json({
        success: true,
        voucher: serializeVoucher(result[0]!.voucher, result[0]!.code),
        message: 'Copy the code now — it will not be shown again.',
      });
      return;
    }

    res.status(201).json({
      success: true,
      vouchers: result.map((r) => serializeVoucher(r.voucher, r.code)),
      codes: result.map((r) => r.code),
      message: 'Copy these codes now — they will not be shown again.',
    });
  } catch (error) {
    next(error);
  }
};

export const updateVoucher = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = voucherUpdateSchema.parse(req.body);
    const existing = await prisma.voucher.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });
    if (!existing) throw new AppError('Voucher not found', 404);

    if (data.discountType === 'PERCENT' && data.discountValue != null && data.discountValue > 100) {
      throw new AppError('Percentage cannot exceed 100', 400);
    }
    if (data.assigneeType && data.assigneeType !== 'NONE' && data.assigneeId === null) {
      throw new AppError('assigneeId is required when assigneeType is set', 400);
    }

    const voucher = await prisma.$transaction(async (tx) => {
      if (data.scope === 'SELECTED_ITEMS' && data.items) {
        await tx.voucherItem.deleteMany({ where: { voucherId: existing.id } });
        if (data.items.length === 0) {
          throw new AppError('Select at least one item for SELECTED_ITEMS scope', 400);
        }
        await tx.voucherItem.createMany({
          data: data.items.map((i) => ({
            voucherId: existing.id,
            itemType: i.itemType,
            itemId: i.itemId,
          })),
        });
      } else if (data.scope === 'OVERALL') {
        await tx.voucherItem.deleteMany({ where: { voucherId: existing.id } });
      }

      return tx.voucher.update({
        where: { id: existing.id },
        data: {
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.description !== undefined ? { description: data.description } : {}),
          ...(data.discountType !== undefined ? { discountType: data.discountType } : {}),
          ...(data.discountValue !== undefined ? { discountValue: data.discountValue } : {}),
          ...(data.scope !== undefined ? { scope: data.scope } : {}),
          ...(data.appliesRoom !== undefined ? { appliesRoom: data.appliesRoom } : {}),
          ...(data.appliesDayLong !== undefined ? { appliesDayLong: data.appliesDayLong } : {}),
          ...(data.appliesRestaurant !== undefined ? { appliesRestaurant: data.appliesRestaurant } : {}),
          ...(data.minSpend !== undefined ? { minSpend: data.minSpend } : {}),
          ...(data.maxDiscountAmount !== undefined ? { maxDiscountAmount: data.maxDiscountAmount } : {}),
          ...(data.startsAt !== undefined
            ? { startsAt: data.startsAt ? new Date(data.startsAt) : null }
            : {}),
          ...(data.expiresAt !== undefined
            ? { expiresAt: data.expiresAt ? new Date(data.expiresAt) : null }
            : {}),
          ...(data.maxRedemptions !== undefined ? { maxRedemptions: data.maxRedemptions } : {}),
          ...(data.maxPerAssignee !== undefined ? { maxPerAssignee: data.maxPerAssignee } : {}),
          ...(data.isSecure !== undefined ? { isSecure: data.isSecure } : {}),
          ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
          ...(data.assigneeType !== undefined ? { assigneeType: data.assigneeType } : {}),
          ...(data.assigneeId !== undefined
            ? { assigneeId: data.assigneeType === 'NONE' ? null : data.assigneeId }
            : {}),
        },
        include: { items: true, _count: { select: { redemptions: true } } },
      });
    });

    res.json({ success: true, voucher: serializeVoucher(voucher) });
  } catch (error) {
    next(error);
  }
};

export const deactivateVoucher = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.voucher.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError('Voucher not found', 404);
    const voucher = await prisma.voucher.update({
      where: { id: req.params.id },
      data: { isActive: false },
      include: { items: true, _count: { select: { redemptions: true } } },
    });
    res.json({ success: true, voucher: serializeVoucher(voucher) });
  } catch (error) {
    next(error);
  }
};

export const validateVoucher = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = voucherValidateSchema.parse(req.body);
    const result = await validateVoucherForCheckout(prisma, {
      code: data.code,
      channel: data.channel,
      grossAmount: data.grossAmount,
      lineItems: data.lineItems,
      assignee: {
        guestId: data.guestId,
        guestEmail: data.guestEmail,
        userId: data.userId,
        shareholderId: data.shareholderId,
      },
    });
    res.json({
      success: true,
      ...result,
      netAmount: Math.round((result.grossAmount - result.discountAmount) * 100) / 100,
    });
  } catch (error) {
    next(error);
  }
};

export const listRedemptions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const redemptions = await prisma.voucherRedemption.findMany({
      where: { voucherId: req.params.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ success: true, redemptions });
  } catch (error) {
    next(error);
  }
};
