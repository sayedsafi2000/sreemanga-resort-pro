import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import {
  voucherCreateSchema,
  voucherUpdateSchema,
  voucherValidateSchema,
  voucherForEmailSchema,
} from '../validators/voucherValidator';
import {
  codeHintFrom,
  generateVoucherCode,
  hashVoucherCode,
  normalizeCode,
  validateVoucherForCheckout,
  resolveAssigneeIdentities,
  findVouchersForIdentities,
  filterAvailableVouchers,
  isRedemptionLimitReached,
  deactivateIfRedemptionLimitReached,
} from '../utils/voucher';

const voucherInclude = {
  items: true,
  assignees: true,
  _count: { select: { redemptions: true } },
} as const;

function serializeVoucher(v: any, plaintextCode?: string) {
  const { codeHash: _h, codePlain, ...rest } = v;
  const code = plaintextCode || codePlain || undefined;
  return {
    ...rest,
    assignees: v.assignees || [],
    ...(code ? { code } : {}),
    redemptionCount: v._count?.redemptions ?? v.redemptions?.length ?? undefined,
  };
}

async function syncAssignees(
  tx: any,
  voucherId: string,
  assignees: { assigneeType: string; assigneeId: string }[]
) {
  await tx.voucherAssignee.deleteMany({ where: { voucherId } });
  if (assignees.length > 0) {
    await tx.voucherAssignee.createMany({
      data: assignees.map((a) => ({
        voucherId,
        assigneeType: a.assigneeType,
        assigneeId: a.assigneeId,
      })),
    });
  }
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

  if (data.scope === 'SELECTED_ITEMS' && (!data.items || data.items.length === 0)) {
    throw new AppError('Select at least one item for SELECTED_ITEMS scope', 400);
  }
  if (data.discountType === 'PERCENT' && data.discountValue > 100) {
    throw new AppError('Percentage cannot exceed 100', 400);
  }

  const assignees = data.assignees || [];

  const voucher = await tx.voucher.create({
    data: {
      codeHash,
      codeHint: codeHintFrom(normalized),
      codePlain: normalized,
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
      audienceAllGuests: data.audienceAllGuests ?? false,
      audienceAllStaff: data.audienceAllStaff ?? false,
      audienceAllShareholders: data.audienceAllShareholders ?? false,
      assigneeType: assignees.length === 0 ? 'NONE' : assignees[0]!.assigneeType,
      assigneeId: assignees.length === 0 ? null : assignees[0]!.assigneeId,
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
      assignees:
        assignees.length > 0
          ? {
              create: assignees.map((a) => ({
                assigneeType: a.assigneeType,
                assigneeId: a.assigneeId,
              })),
            }
          : undefined,
    },
    include: voucherInclude,
  });

  return voucher;
}

/** One-shot: copy legacy assigneeType/assigneeId into VoucherAssignee rows. */
export async function backfillVoucherAssignees() {
  const legacy = await prisma.voucher.findMany({
    where: {
      assigneeType: { not: 'NONE' },
      assigneeId: { not: null },
      assignees: { none: {} },
    },
    select: { id: true, assigneeType: true, assigneeId: true },
  });
  for (const v of legacy) {
    if (!v.assigneeId || v.assigneeType === 'NONE') continue;
    await prisma.voucherAssignee.create({
      data: {
        voucherId: v.id,
        assigneeType: v.assigneeType,
        assigneeId: v.assigneeId,
      },
    }).catch(() => undefined);
  }

  // Restore known local demo plaintext codes for admin copy (hash match only).
  for (const code of ['SUMMER10', 'POOL500', 'STAFF15', 'SHARE20'] as const) {
    const codeHash = hashVoucherCode(code);
    await prisma.voucher
      .updateMany({ where: { codeHash, codePlain: null }, data: { codePlain: code } })
      .catch(() => undefined);
  }

  return legacy.length;
}

export const listVouchers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await backfillVoucherAssignees();
    const { active, q, email } = req.query;
    const emailStr = typeof email === 'string' ? email.trim() : '';

    // Lookup vouchers available to a person (Guest / User / Shareholder by email)
    if (emailStr) {
      const identities = await resolveAssigneeIdentities(prisma, { guestEmail: emailStr });
      let vouchers = await findVouchersForIdentities(prisma, identities, {
        includeAllGuests: true,
      });

      const publicOnes = await prisma.voucher.findMany({
        where: {
          isActive: true,
          assignees: { none: {} },
          audienceAllGuests: false,
          audienceAllStaff: false,
          audienceAllShareholders: false,
          OR: [{ assigneeType: 'NONE' }, { assigneeId: null }],
        },
        include: voucherInclude,
        orderBy: [{ expiresAt: 'asc' }, { createdAt: 'desc' }],
      });

      // Auto-off any exhausted public vouchers, then hide them from apply lists
      for (const v of publicOnes) {
        if (isRedemptionLimitReached(v)) {
          await deactivateIfRedemptionLimitReached(prisma, v);
        }
      }

      const byId = new Map<string, any>();
      for (const v of [...vouchers, ...filterAvailableVouchers(publicOnes)]) byId.set(v.id, v);
      let merged: any[] = Array.from(byId.values());
      merged = filterAvailableVouchers(merged);

      if (typeof q === 'string' && q.trim()) {
        const needle = q.trim().toLowerCase();
        const hint = q.trim().toUpperCase();
        merged = merged.filter(
          (v: any) =>
            (v.name || '').toLowerCase().includes(needle) ||
            (v.codeHint || '').includes(hint) ||
            (v.description || '').toLowerCase().includes(needle)
        );
      }
      if (active === 'true') merged = merged.filter((v: any) => v.isActive);
      if (active === 'false') merged = merged.filter((v: any) => !v.isActive);

      res.json({
        success: true,
        vouchers: merged.map((v: any) => serializeVoucher(v)),
        identities: identities.map((i) => i.type),
        lookupEmail: emailStr,
      });
      return;
    }

    const where: any = {};
    if (active === 'true') where.isActive = true;
    if (active === 'false') where.isActive = false;
    if (typeof q === 'string' && q.trim()) {
      where.OR = [
        { name: { contains: q.trim(), mode: 'insensitive' } },
        { codeHint: { contains: q.trim().toUpperCase() } },
        { description: { contains: q.trim(), mode: 'insensitive' } },
      ];
    }
    const vouchers = await prisma.voucher.findMany({
      where,
      include: voucherInclude,
      orderBy: { createdAt: 'desc' },
    });

    // Lazy auto-off: any active voucher that already hit max redemptions
    for (const v of vouchers) {
      if (v.isActive && isRedemptionLimitReached(v)) {
        await deactivateIfRedemptionLimitReached(prisma, v);
        (v as any).isActive = false;
      }
    }

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
        assignees: true,
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
      include: { items: true, assignees: true },
    });
    if (!existing) throw new AppError('Voucher not found', 404);

    if (data.discountType === 'PERCENT' && data.discountValue != null && data.discountValue > 100) {
      throw new AppError('Percentage cannot exceed 100', 400);
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

      if (data.assignees !== undefined) {
        await syncAssignees(tx, existing.id, data.assignees);
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
          ...(data.audienceAllGuests !== undefined
            ? { audienceAllGuests: data.audienceAllGuests }
            : {}),
          ...(data.audienceAllStaff !== undefined
            ? { audienceAllStaff: data.audienceAllStaff }
            : {}),
          ...(data.audienceAllShareholders !== undefined
            ? { audienceAllShareholders: data.audienceAllShareholders }
            : {}),
          ...(data.assignees !== undefined
            ? {
                assigneeType:
                  data.assignees.length === 0 ? 'NONE' : data.assignees[0]!.assigneeType,
                assigneeId: data.assignees.length === 0 ? null : data.assignees[0]!.assigneeId,
              }
            : {}),
        },
        include: voucherInclude,
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
      include: voucherInclude,
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
    const rows = await prisma.voucherRedemption.findMany({
      where: { voucherId: req.params.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const userIds = [...new Set(rows.map((r) => r.redeemedById).filter(Boolean))] as string[];
    const guestIds = [...new Set(rows.map((r) => r.guestId).filter(Boolean))] as string[];

    const [users, guests] = await Promise.all([
      userIds.length
        ? prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true, email: true },
          })
        : Promise.resolve([]),
      guestIds.length
        ? prisma.guest.findMany({
            where: { id: { in: guestIds } },
            select: { id: true, name: true, email: true },
          })
        : Promise.resolve([]),
    ]);

    const userById = new Map(users.map((u) => [u.id, u]));
    const guestById = new Map(guests.map((g) => [g.id, g]));

    const redemptions = rows.map((r) => {
      const staff = r.redeemedById ? userById.get(r.redeemedById) : undefined;
      const guestRow = r.guestId ? guestById.get(r.guestId) : undefined;
      return {
        id: r.id,
        createdAt: r.createdAt,
        amountDiscounted: r.amountDiscounted,
        source: r.source,
        channel: r.channel,
        referenceType: r.referenceType,
        referenceId: r.referenceId,
        guestEmail: r.guestEmail,
        redeemedBy: staff
          ? { id: staff.id, name: staff.name, email: staff.email }
          : null,
        guest: guestRow
          ? {
              id: guestRow.id,
              name: guestRow.name,
              email: guestRow.email || r.guestEmail || null,
            }
          : r.guestEmail
            ? { id: null, name: null, email: r.guestEmail }
            : null,
      };
    });

    res.json({ success: true, redemptions });
  } catch (error) {
    next(error);
  }
};

export function toSafeMineVoucher(v: any) {
  const now = new Date();
  const expired = !!(v.expiresAt && v.expiresAt < now);
  const uses = v._count?.redemptions ?? 0;
  const exhausted = isRedemptionLimitReached(v);
  const assignees = v.assignees || [];
  return {
    id: v.id,
    name: v.name,
    description: v.description,
    discountType: v.discountType,
    discountValue: v.discountValue,
    scope: v.scope,
    appliesRoom: v.appliesRoom,
    appliesDayLong: v.appliesDayLong,
    appliesRestaurant: v.appliesRestaurant,
    startsAt: v.startsAt,
    expiresAt: v.expiresAt,
    maxRedemptions: v.maxRedemptions,
    maxPerAssignee: v.maxPerAssignee,
    codeHint: v.codeHint,
    assigneeType: v.assigneeType,
    assignees,
    audienceAllGuests: !!v.audienceAllGuests,
    audienceAllStaff: !!v.audienceAllStaff,
    audienceAllShareholders: !!v.audienceAllShareholders,
    isActive: v.isActive && !exhausted,
    expired,
    exhausted,
    redemptionCount: uses,
    remaining:
      v.maxRedemptions != null ? Math.max(0, v.maxRedemptions - uses) : null,
  };
}

/** Vouchers assigned to the current user (USER) and/or their shareholder profile. */
export async function findMineVouchers(userId: string, shareholderId?: string | null) {
  await backfillVoucherAssignees();
  const identities = [
    { type: 'USER' as const, id: userId },
    ...(shareholderId ? [{ type: 'SHAREHOLDER' as const, id: shareholderId }] : []),
  ];
  const vouchers = await findVouchersForIdentities(prisma, identities);
  return vouchers.map(toSafeMineVoucher);
}

export const listMyVouchers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new AppError('Unauthorized', 401);

    const shareholder = await prisma.shareholder.findUnique({
      where: { userId },
      select: { id: true },
    });

    const vouchers = await findMineVouchers(userId, shareholder?.id ?? null);
    res.json({ success: true, vouchers });
  } catch (error) {
    next(error);
  }
};

/** Public: list vouchers assigned to any identity matching this email. */
export const listVouchersForEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = voucherForEmailSchema.parse(req.body);
    await backfillVoucherAssignees();
    const identities = await resolveAssigneeIdentities(prisma, { guestEmail: email });
    const vouchers = await findVouchersForIdentities(prisma, identities, {
      includeAllGuests: true,
    });
    res.json({
      success: true,
      vouchers: vouchers.map(toSafeMineVoucher),
      identities: identities.map((i) => i.type),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Staff apply lookup: vouchers for an email (assigned + public), includes codePlain as `code`.
 * APPLY roles only — never expose codeHash.
 */
export const lookupVouchersByEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const emailRaw = typeof req.query.email === 'string' ? req.query.email.trim() : '';
    const { email } = voucherForEmailSchema.parse({ email: emailRaw });
    await backfillVoucherAssignees();

    const identities = await resolveAssigneeIdentities(prisma, { guestEmail: email });
    let vouchers = await findVouchersForIdentities(prisma, identities, {
      includeAllGuests: true,
    });

    const publicOnes = await prisma.voucher.findMany({
      where: {
        isActive: true,
        assignees: { none: {} },
        audienceAllGuests: false,
        audienceAllStaff: false,
        audienceAllShareholders: false,
        OR: [{ assigneeType: 'NONE' }, { assigneeId: null }],
      },
      include: {
        assignees: true,
        _count: { select: { redemptions: true } },
      },
      orderBy: [{ expiresAt: 'asc' }, { createdAt: 'desc' }],
    });

    for (const v of publicOnes) {
      if (isRedemptionLimitReached(v)) {
        await deactivateIfRedemptionLimitReached(prisma, v);
      }
    }

    const byId = new Map<string, any>();
    for (const v of [...vouchers, ...filterAvailableVouchers(publicOnes)]) byId.set(v.id, v);
    vouchers = filterAvailableVouchers(Array.from(byId.values()));

    res.json({
      success: true,
      vouchers: vouchers.map((v: any) => {
        const safe = toSafeMineVoucher(v);
        return {
          ...safe,
          ...(v.codePlain ? { code: v.codePlain } : {}),
        };
      }),
      identities: identities.map((i) => i.type),
      lookupEmail: email,
    });
  } catch (error) {
    next(error);
  }
};
