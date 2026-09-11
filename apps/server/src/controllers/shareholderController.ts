import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { recordManualEntry, METHOD_ACCOUNT } from '../utils/accountLedger';
import {
  shareholderSchema,
  holdingCreateSchema,
  sharePaymentSchema,
  holdingCancelSchema,
  tierUpdateSchema,
} from '../validators/shareholderValidator';
import {
  DEFAULT_SHARE_TIERS,
  activeCapital,
  holdingStatusFor,
  round2,
  summarizeHoldings,
  tierAvailability,
} from '../utils/shareCapital';

type Tx = Prisma.TransactionClient;
type Db = Tx | typeof prisma;

const HOLDING_INCLUDE = {
  tier: true,
  payments: { orderBy: { paidAt: 'asc' as const } },
} as const;

const SHAREHOLDER_INCLUDE = {
  user: { select: { id: true, email: true, role: true } },
  holdings: { include: HOLDING_INCLUDE, orderBy: { purchaseDate: 'asc' as const } },
} as const;

/** Gold / Platinum exist on every install without re-seeding. Idempotent. */
export async function ensureDefaultTiers(db: Db = prisma) {
  for (const t of DEFAULT_SHARE_TIERS) {
    await db.shareTier.upsert({ where: { code: t.code }, update: {}, create: { ...t } });
  }
}

/** Σ paid-up capital of active shareholders — the denominator for ownership %. */
async function totalActiveCapital(db: Db = prisma): Promise<number> {
  const agg = await db.shareHolding.aggregate({
    _sum: { totalPrice: true },
    where: { status: 'ACTIVE', shareholder: { isActive: true } },
  });
  return round2(agg._sum.totalPrice ?? 0);
}

function decorate<T extends { isActive: boolean; holdings: any[] }>(sh: T, totalCapital: number) {
  const summary = summarizeHoldings(sh.holdings);
  const ownershipPercent =
    sh.isActive && totalCapital > 0 ? round2((summary.activeCapital / totalCapital) * 100) : 0;
  return { ...sh, summary: { ...summary, ownershipPercent } };
}

async function ledgerIn(tx: Tx, method: string, amount: number, description: string, userId?: string) {
  const account = await tx.account.findUnique({ where: { code: METHOD_ACCOUNT[method] ?? '1001' } });
  if (account && amount > 0) {
    await recordManualEntry(tx, { accountId: account.id, direction: 'IN', amount, description, createdById: userId });
  }
}

// ── Share tiers ────────────────────────────────────────────────────────────
export const listTiers = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    await ensureDefaultTiers();
    const [tiers, grouped, shareholders] = await Promise.all([
      prisma.shareTier.findMany({ orderBy: { sortOrder: 'asc' } }),
      prisma.shareHolding.groupBy({
        by: ['tierId', 'status'],
        _sum: { quantity: true, totalPrice: true, paidAmount: true },
      }),
      prisma.shareholder.count({ where: { isActive: true } }),
    ]);
    const rows = tiers.map((t) => {
      const live = grouped.filter((g) => g.tierId === t.id && g.status !== 'CANCELLED');
      const soldUnits = live.reduce((s, g) => s + (g._sum.quantity ?? 0), 0);
      const active = live.filter((g) => g.status === 'ACTIVE');
      return {
        ...t,
        activeUnits: active.reduce((s, g) => s + (g._sum.quantity ?? 0), 0),
        activeCapital: round2(active.reduce((s, g) => s + (g._sum.totalPrice ?? 0), 0)),
        dueTotal: round2(live.reduce((s, g) => s + ((g._sum.totalPrice ?? 0) - (g._sum.paidAmount ?? 0)), 0)),
        ...tierAvailability(t, soldUnits),
      };
    });
    res.json({
      success: true,
      tiers: rows,
      totals: {
        shareholders,
        soldUnits: rows.reduce((s, r) => s + r.soldUnits, 0),
        activeCapital: round2(rows.reduce((s, r) => s + r.activeCapital, 0)),
        dueTotal: round2(rows.reduce((s, r) => s + r.dueTotal, 0)),
      },
    });
  } catch (error) { next(error); }
};

export const updateTier = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = tierUpdateSchema.parse(req.body);
    const tier = await prisma.shareTier.findUnique({ where: { id: req.params.id } });
    if (!tier) throw new AppError('Share tier not found', 404);
    if (data.totalUnits != null) {
      const sold = await prisma.shareHolding.aggregate({
        _sum: { quantity: true },
        where: { tierId: tier.id, status: { not: 'CANCELLED' } },
      });
      const soldUnits = sold._sum.quantity ?? 0;
      if (data.totalUnits < soldUnits) {
        throw new AppError(`${soldUnits} ${tier.name} unit(s) are already sold; the cap cannot be lower than that`, 400);
      }
    }
    const updated = await prisma.shareTier.update({
      where: { id: tier.id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.unitPrice !== undefined ? { unitPrice: data.unitPrice } : {}),
        ...(data.totalUnits !== undefined ? { totalUnits: data.totalUnits } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
      },
    });
    res.json({ success: true, tier: updated });
  } catch (error) { next(error); }
};

// ── Shareholder CRUD ───────────────────────────────────────────────────────
export const listShareholders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { active } = req.query;
    const where: Prisma.ShareholderWhereInput = {};
    if (active === 'true') where.isActive = true;
    const [shareholders, totalCapital] = await Promise.all([
      prisma.shareholder.findMany({ where, include: SHAREHOLDER_INCLUDE, orderBy: { createdAt: 'desc' } }),
      totalActiveCapital(),
    ]);
    res.json({ success: true, totalCapital, shareholders: shareholders.map((s) => decorate(s, totalCapital)) });
  } catch (error) { next(error); }
};

export const getShareholder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [shareholder, totalCapital] = await Promise.all([
      prisma.shareholder.findUnique({
        where: { id: req.params.id },
        include: {
          ...SHAREHOLDER_INCLUDE,
          profitShares: { include: { distribution: true }, orderBy: { createdAt: 'desc' } },
        },
      }),
      totalActiveCapital(),
    ]);
    if (!shareholder) throw new AppError('Shareholder not found', 404);
    res.json({ success: true, totalCapital, shareholder: decorate(shareholder, totalCapital) });
  } catch (error) { next(error); }
};

export const createShareholder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = shareholderSchema.parse({ ...req.body, email: req.body.email === '' ? null : req.body.email });
    const shareholder = await prisma.$transaction(async (tx) => {
      let userId: string | undefined;
      if (data.createLogin) {
        if (!data.email) throw new AppError('Email is required to create a login', 400);
        if (!data.password) throw new AppError('Password is required to create a login', 400);
        const existing = await tx.user.findUnique({ where: { email: data.email } });
        if (existing) throw new AppError('A user with this email already exists', 409);
        const user = await tx.user.create({
          data: { name: data.name, email: data.email, password: await bcrypt.hash(data.password, 10), role: 'SHAREHOLDER' },
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
          joinDate: data.joinDate ? new Date(data.joinDate) : undefined,
          isActive: data.isActive ?? true,
          notes: data.notes ?? null,
        },
        include: SHAREHOLDER_INCLUDE,
      });
    });
    res.status(201).json({ success: true, shareholder: decorate(shareholder, await totalActiveCapital()) });
  } catch (error) { next(error); }
};

export const updateShareholder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = shareholderSchema.partial().parse({ ...req.body, email: req.body.email === '' ? null : req.body.email });
    const existing = await prisma.shareholder.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError('Shareholder not found', 404);

    const shareholder = await prisma.$transaction(async (tx) => {
      let userId: string | undefined;
      if (data.createLogin && !existing.userId) {
        const email = data.email !== undefined ? data.email : existing.email;
        if (!email) throw new AppError('Email is required to create a login', 400);
        if (!data.password) throw new AppError('Password is required to create a login', 400);
        const conflict = await tx.user.findUnique({ where: { email } });
        if (conflict) throw new AppError('A user with this email already exists', 409);
        const user = await tx.user.create({
          data: { name: data.name ?? existing.name, email, password: await bcrypt.hash(data.password, 10), role: 'SHAREHOLDER' },
        });
        userId = user.id;
      }
      return tx.shareholder.update({
        where: { id: req.params.id },
        data: {
          ...(userId !== undefined ? { userId } : {}),
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.phone !== undefined ? { phone: data.phone } : {}),
          ...(data.email !== undefined ? { email: data.email } : {}),
          ...(data.address !== undefined ? { address: data.address } : {}),
          ...(data.nid !== undefined ? { nid: data.nid } : {}),
          ...(data.joinDate !== undefined
            ? { joinDate: data.joinDate ? new Date(data.joinDate) : existing.joinDate }
            : {}),
          ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
          ...(data.notes !== undefined ? { notes: data.notes } : {}),
        },
        include: SHAREHOLDER_INCLUDE,
      });
    });
    res.json({ success: true, shareholder: decorate(shareholder, await totalActiveCapital()) });
  } catch (error) { next(error); }
};

/**
 * Hard-delete only when nothing financial ever happened (no payments, no
 * distribution rows). Otherwise deactivate so history stays intact.
 */
export const deleteShareholder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.shareholder.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { profitShares: true } }, holdings: { select: { paidAmount: true } } },
    });
    if (!existing) throw new AppError('Shareholder not found', 404);
    const hasHistory = existing._count.profitShares > 0 || existing.holdings.some((h) => h.paidAmount > 0);
    if (hasHistory) {
      await prisma.shareholder.update({ where: { id: existing.id }, data: { isActive: false } });
      res.json({
        success: true,
        deleted: false,
        message: 'This shareholder has payment or distribution history, so it was deactivated instead of deleted.',
      });
      return;
    }
    await prisma.shareholder.delete({ where: { id: existing.id } }); // holdings cascade
    if (existing.userId) {
      await prisma.user.delete({ where: { id: existing.userId } }).catch(() => null); // portal login, best-effort
    }
    res.json({ success: true, deleted: true, message: 'Shareholder deleted' });
  } catch (error) { next(error); }
};

// ── Holdings (units bought) ───────────────────────────────────────────────
export const addHolding = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = holdingCreateSchema.parse(req.body);
    const userId = (req as any).user?.id as string | undefined;
    const holding = await prisma.$transaction(async (tx) => {
      const sh = await tx.shareholder.findUnique({ where: { id: req.params.id } });
      if (!sh) throw new AppError('Shareholder not found', 404);
      await ensureDefaultTiers(tx);
      const tier = data.tierId
        ? await tx.shareTier.findUnique({ where: { id: data.tierId } })
        : await tx.shareTier.findUnique({ where: { code: data.tierCode!.toUpperCase() } });
      if (!tier || !tier.isActive) throw new AppError('Share tier not found or inactive', 400);

      if (tier.totalUnits != null) {
        const sold = await tx.shareHolding.aggregate({
          _sum: { quantity: true },
          where: { tierId: tier.id, status: { not: 'CANCELLED' } },
        });
        const available = tier.totalUnits - (sold._sum.quantity ?? 0);
        if (data.quantity > available) {
          throw new AppError(`Only ${Math.max(0, available)} ${tier.name} unit(s) left (cap ${tier.totalUnits})`, 400);
        }
      }

      const totalPrice = round2(tier.unitPrice * data.quantity);
      const initial = data.initialPayment ?? null;
      if (initial && initial.amount > totalPrice + 1e-6) throw new AppError('Initial payment exceeds the holding price', 400);
      const paidAmount = initial ? round2(initial.amount) : 0;
      const status = holdingStatusFor(paidAmount, totalPrice);

      const created = await tx.shareHolding.create({
        data: {
          shareholderId: sh.id,
          tierId: tier.id,
          quantity: data.quantity,
          unitPrice: tier.unitPrice,
          totalPrice,
          paidAmount,
          status,
          activatedAt: status === 'ACTIVE' ? new Date() : null,
          purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
          notes: data.notes ?? null,
          createdById: userId ?? null,
        },
      });
      if (initial) {
        await tx.sharePayment.create({
          data: {
            holdingId: created.id,
            amount: paidAmount,
            method: initial.method,
            transactionId: initial.transactionId ?? null,
            paidAt: initial.paidAt ? new Date(initial.paidAt) : undefined,
            notes: initial.notes ?? null,
            recordedById: userId ?? null,
          },
        });
        await ledgerIn(tx, initial.method, paidAmount, `Share capital - ${sh.name} - ${data.quantity} × ${tier.name}`, userId);
      }
      return tx.shareHolding.findUnique({ where: { id: created.id }, include: HOLDING_INCLUDE });
    });
    res.status(201).json({ success: true, holding });
  } catch (error) { next(error); }
};

export const addHoldingPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = sharePaymentSchema.parse(req.body);
    const userId = (req as any).user?.id as string | undefined;
    const holding = await prisma.$transaction(async (tx) => {
      const h = await tx.shareHolding.findUnique({
        where: { id: req.params.holdingId },
        include: { tier: true, shareholder: true },
      });
      if (!h) throw new AppError('Holding not found', 404);
      if (h.status === 'CANCELLED') throw new AppError('This holding is cancelled', 400);
      const remaining = round2(h.totalPrice - h.paidAmount);
      if (remaining <= 0) throw new AppError('This holding is already fully paid', 400);
      if (data.amount > remaining + 1e-6) throw new AppError(`Amount exceeds the remaining due (${remaining})`, 400);

      const paidAmount = round2(h.paidAmount + data.amount);
      const status = holdingStatusFor(paidAmount, h.totalPrice, h.status);
      await tx.sharePayment.create({
        data: {
          holdingId: h.id,
          amount: round2(data.amount),
          method: data.method,
          transactionId: data.transactionId ?? null,
          paidAt: data.paidAt ? new Date(data.paidAt) : undefined,
          notes: data.notes ?? null,
          recordedById: userId ?? null,
        },
      });
      const updated = await tx.shareHolding.update({
        where: { id: h.id },
        data: { paidAmount, status, activatedAt: status === 'ACTIVE' && !h.activatedAt ? new Date() : h.activatedAt },
        include: HOLDING_INCLUDE,
      });
      await ledgerIn(tx, data.method, data.amount, `Share capital instalment - ${h.shareholder.name} - ${h.quantity} × ${h.tier.name}`, userId);
      return updated;
    });
    res.json({ success: true, holding });
  } catch (error) { next(error); }
};

export const cancelHolding = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = holdingCancelSchema.parse(req.body ?? {});
    const userId = (req as any).user?.id as string | undefined;
    const holding = await prisma.$transaction(async (tx) => {
      const h = await tx.shareHolding.findUnique({
        where: { id: req.params.holdingId },
        include: { tier: true, shareholder: true },
      });
      if (!h) throw new AppError('Holding not found', 404);
      if (h.status === 'CANCELLED') throw new AppError('This holding is already cancelled', 400);
      const updated = await tx.shareHolding.update({
        where: { id: h.id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          notes: [h.notes, data.notes].filter(Boolean).join(' | ') || null,
        },
        include: HOLDING_INCLUDE,
      });
      if (data.refund && h.paidAmount > 0) {
        const cash = await tx.account.findUnique({ where: { code: '1001' } });
        if (cash) {
          await recordManualEntry(tx, {
            accountId: cash.id,
            direction: 'OUT',
            amount: h.paidAmount,
            description: `Share capital refund - ${h.shareholder.name} - ${h.quantity} × ${h.tier.name}`,
            createdById: userId,
          });
        }
      }
      return updated;
    });
    res.json({ success: true, holding });
  } catch (error) { next(error); }
};

/** Only holdings with no money recorded can be deleted; paid ones must be cancelled (refund) instead. */
export const deleteHolding = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const h = await prisma.shareHolding.findUnique({
      where: { id: req.params.holdingId },
      include: { _count: { select: { payments: true } } },
    });
    if (!h) throw new AppError('Holding not found', 404);
    if (h.paidAmount > 0 || h._count.payments > 0) {
      throw new AppError('This holding has recorded payments. Cancel it (with refund) instead of deleting.', 400);
    }
    await prisma.shareHolding.delete({ where: { id: h.id } });
    res.json({ success: true, message: 'Holding deleted' });
  } catch (error) { next(error); }
};

export { activeCapital };
