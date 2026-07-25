import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';

export type VoucherChannel = 'ROOM' | 'DAY_LONG' | 'RESTAURANT';

export type VoucherLineItem = {
  itemType: 'ROOM' | 'DAY_LONG_PRODUCT' | 'MENU_ITEM';
  itemId: string;
  amount: number;
};

export type VoucherAssigneeContext = {
  guestId?: string | null;
  userId?: string | null;
  shareholderId?: string | null;
  guestEmail?: string | null;
};

export type ValidatedVoucher = {
  voucher: {
    id: string;
    name: string;
    discountType: string;
    discountValue: number;
    scope: string;
    codeHint: string;
    maxDiscountAmount: number | null;
    minSpend: number | null;
  };
  discountAmount: number;
  eligibleSubtotal: number;
  grossAmount: number;
};

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateVoucherCode(length = 10): string {
  let out = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    out += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length];
  }
  return out;
}

export function hashVoucherCode(code: string): string {
  return crypto.createHash('sha256').update(normalizeCode(code)).digest('hex');
}

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, '');
}

export function codeHintFrom(code: string): string {
  const n = normalizeCode(code);
  return n.slice(-4);
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

type VoucherRow = Prisma.VoucherGetPayload<{ include: { items: true; _count: { select: { redemptions: true } } } }>;

export async function findVoucherByCode(
  tx: Prisma.TransactionClient | typeof import('./prisma').default,
  code: string
): Promise<VoucherRow | null> {
  const codeHash = hashVoucherCode(code);
  return (tx as any).voucher.findUnique({
    where: { codeHash },
    include: {
      items: true,
      _count: { select: { redemptions: true } },
    },
  });
}

export async function validateVoucherForCheckout(
  tx: Prisma.TransactionClient | typeof import('./prisma').default,
  opts: {
    code: string;
    channel: VoucherChannel;
    grossAmount: number;
    lineItems?: VoucherLineItem[];
    assignee?: VoucherAssigneeContext;
  }
): Promise<ValidatedVoucher> {
  const voucher = await findVoucherByCode(tx, opts.code);
  if (!voucher || !voucher.isActive) {
    throw new AppError('Invalid or inactive voucher code', 400);
  }

  const now = new Date();
  if (voucher.startsAt && voucher.startsAt > now) {
    throw new AppError('This voucher is not active yet', 400);
  }
  if (voucher.expiresAt && voucher.expiresAt < now) {
    throw new AppError('This voucher has expired', 400);
  }

  if (opts.channel === 'ROOM' && !voucher.appliesRoom) {
    throw new AppError('Voucher does not apply to room bookings', 400);
  }
  if (opts.channel === 'DAY_LONG' && !voucher.appliesDayLong) {
    throw new AppError('Voucher does not apply to day-long bookings', 400);
  }
  if (opts.channel === 'RESTAURANT' && !voucher.appliesRestaurant) {
    throw new AppError('Voucher does not apply to restaurant orders', 400);
  }

  if (voucher.maxRedemptions != null && voucher._count.redemptions >= voucher.maxRedemptions) {
    throw new AppError('Voucher has reached its redemption limit', 400);
  }

  // Assignee lock
  if (voucher.assigneeType !== 'NONE' && voucher.assigneeId) {
    const a = opts.assignee || {};
    let ok = false;
    if (voucher.assigneeType === 'GUEST') {
      ok = !!a.guestId && a.guestId === voucher.assigneeId;
      if (!ok && a.guestEmail) {
        const guest = await (tx as any).guest.findUnique({ where: { id: voucher.assigneeId } });
        ok = !!guest?.email && guest.email.toLowerCase() === a.guestEmail.toLowerCase();
      }
    } else if (voucher.assigneeType === 'USER') {
      ok = !!a.userId && a.userId === voucher.assigneeId;
    } else if (voucher.assigneeType === 'SHAREHOLDER') {
      ok = !!a.shareholderId && a.shareholderId === voucher.assigneeId;
    }
    if (!ok) {
      throw new AppError('This voucher is locked to a specific recipient', 403);
    }

    if (voucher.maxPerAssignee != null) {
      const where: any = { voucherId: voucher.id };
      if (voucher.assigneeType === 'GUEST') where.guestId = voucher.assigneeId;
      else where.redeemedById = voucher.assigneeId;
      const used = await (tx as any).voucherRedemption.count({ where });
      if (used >= voucher.maxPerAssignee) {
        throw new AppError('This recipient has already used this voucher the maximum times', 400);
      }
    }
  }

  const lineItems = opts.lineItems || [];
  let eligibleSubtotal = opts.grossAmount;

  if (voucher.scope === 'SELECTED_ITEMS') {
    if (lineItems.length === 0) {
      throw new AppError('This voucher only applies to selected items', 400);
    }
    const allowed = new Set(voucher.items.map((i) => `${i.itemType}:${i.itemId}`));
    eligibleSubtotal = lineItems
      .filter((li) => allowed.has(`${li.itemType}:${li.itemId}`))
      .reduce((s, li) => s + li.amount, 0);
    if (eligibleSubtotal <= 0) {
      throw new AppError('No eligible items for this voucher', 400);
    }
  }

  if (voucher.minSpend != null && opts.grossAmount < voucher.minSpend) {
    throw new AppError(`Minimum spend of ৳${voucher.minSpend} required`, 400);
  }

  let discountAmount = 0;
  if (voucher.discountType === 'PERCENT') {
    discountAmount = (eligibleSubtotal * voucher.discountValue) / 100;
  } else {
    discountAmount = voucher.discountValue;
  }

  if (voucher.maxDiscountAmount != null) {
    discountAmount = Math.min(discountAmount, voucher.maxDiscountAmount);
  }
  discountAmount = Math.min(discountAmount, eligibleSubtotal, opts.grossAmount);
  discountAmount = roundMoney(Math.max(0, discountAmount));

  if (discountAmount <= 0) {
    throw new AppError('Voucher does not produce a discount for this cart', 400);
  }

  return {
    voucher: {
      id: voucher.id,
      name: voucher.name,
      discountType: voucher.discountType,
      discountValue: voucher.discountValue,
      scope: voucher.scope,
      codeHint: voucher.codeHint,
      maxDiscountAmount: voucher.maxDiscountAmount,
      minSpend: voucher.minSpend,
    },
    discountAmount,
    eligibleSubtotal: roundMoney(eligibleSubtotal),
    grossAmount: roundMoney(opts.grossAmount),
  };
}

export async function recordVoucherRedemption(
  tx: Prisma.TransactionClient,
  opts: {
    voucherId: string;
    amountDiscounted: number;
    referenceType: 'BOOKING' | 'DAY_LONG_BOOKING' | 'RESTAURANT_ORDER';
    referenceId: string;
    redeemedById?: string | null;
    guestId?: string | null;
  }
) {
  const existing = await tx.voucherRedemption.findUnique({
    where: {
      voucherId_referenceType_referenceId: {
        voucherId: opts.voucherId,
        referenceType: opts.referenceType,
        referenceId: opts.referenceId,
      },
    },
  });
  if (existing) return existing;

  return tx.voucherRedemption.create({
    data: {
      voucherId: opts.voucherId,
      amountDiscounted: opts.amountDiscounted,
      referenceType: opts.referenceType,
      referenceId: opts.referenceId,
      redeemedById: opts.redeemedById || undefined,
      guestId: opts.guestId || undefined,
    },
  });
}
