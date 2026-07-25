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

export type ResolvedIdentity = {
  type: 'GUEST' | 'USER' | 'SHAREHOLDER';
  id: string;
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

type VoucherRow = Prisma.VoucherGetPayload<{
  include: {
    items: true;
    assignees: true;
    _count: { select: { redemptions: true } };
  };
}>;

export type AssigneeRow = { assigneeType: string; assigneeId: string };

/** Normalize assignees from join rows + legacy columns. */
export function effectiveAssignees(voucher: {
  assignees?: AssigneeRow[] | null;
  assigneeType?: string | null;
  assigneeId?: string | null;
}): AssigneeRow[] {
  const fromJoin = (voucher.assignees || []).filter(
    (a) => a.assigneeType && a.assigneeType !== 'NONE' && a.assigneeId
  );
  if (fromJoin.length > 0) return fromJoin;
  if (voucher.assigneeType && voucher.assigneeType !== 'NONE' && voucher.assigneeId) {
    return [{ assigneeType: voucher.assigneeType, assigneeId: voucher.assigneeId }];
  }
  return [];
}

/**
 * Resolve Guest / User / Shareholder identities from ids and/or email.
 * Same person may appear as multiple types when email matches.
 */
export async function resolveAssigneeIdentities(
  tx: Prisma.TransactionClient | typeof import('./prisma').default,
  a: VoucherAssigneeContext = {}
): Promise<ResolvedIdentity[]> {
  const out: ResolvedIdentity[] = [];
  const seen = new Set<string>();
  const add = (type: ResolvedIdentity['type'], id: string) => {
    const key = `${type}:${id}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ type, id });
  };

  if (a.guestId) add('GUEST', a.guestId);
  if (a.userId) add('USER', a.userId);
  if (a.shareholderId) add('SHAREHOLDER', a.shareholderId);

  const email = a.guestEmail?.trim().toLowerCase();
  if (email) {
    const [user, guests, shareholderByEmail] = await Promise.all([
      (tx as any).user.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
        select: { id: true },
      }),
      (tx as any).guest.findMany({
        where: { email: { equals: email, mode: 'insensitive' } },
        select: { id: true },
      }),
      (tx as any).shareholder.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
        select: { id: true, userId: true },
      }),
    ]);

    if (user) {
      add('USER', user.id);
      const shByUser = await (tx as any).shareholder.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });
      if (shByUser) add('SHAREHOLDER', shByUser.id);
    }
    for (const g of guests || []) add('GUEST', g.id);
    if (shareholderByEmail) {
      add('SHAREHOLDER', shareholderByEmail.id);
      if (shareholderByEmail.userId) add('USER', shareholderByEmail.userId);
    }
  }

  return out;
}

export function identityMatchesAssignees(
  identities: ResolvedIdentity[],
  assignees: AssigneeRow[]
): boolean {
  if (assignees.length === 0) return true;
  const idSet = new Set(identities.map((i) => `${i.type}:${i.id}`));
  return assignees.some((a) => idSet.has(`${a.assigneeType}:${a.assigneeId}`));
}

export async function findVoucherByCode(
  tx: Prisma.TransactionClient | typeof import('./prisma').default,
  code: string
): Promise<VoucherRow | null> {
  const codeHash = hashVoucherCode(code);
  return (tx as any).voucher.findUnique({
    where: { codeHash },
    include: {
      items: true,
      assignees: true,
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

  const assignees = effectiveAssignees(voucher);
  if (assignees.length > 0) {
    const identities = await resolveAssigneeIdentities(tx, opts.assignee || {});
    if (!identityMatchesAssignees(identities, assignees)) {
      throw new AppError('This voucher is not assigned to this guest/email', 403);
    }

    if (voucher.maxPerAssignee != null) {
      // Count redemptions tied to any matching guest identity, else by redeemedById for USER/SHAREHOLDER
      const guestIds = identities.filter((i) => i.type === 'GUEST').map((i) => i.id);
      const otherIds = identities
        .filter((i) => i.type === 'USER' || i.type === 'SHAREHOLDER')
        .map((i) => i.id);
      const or: any[] = [];
      if (guestIds.length) or.push({ guestId: { in: guestIds } });
      if (otherIds.length) or.push({ redeemedById: { in: otherIds } });
      if (or.length) {
        const used = await (tx as any).voucherRedemption.count({
          where: { voucherId: voucher.id, OR: or },
        });
        if (used >= voucher.maxPerAssignee) {
          throw new AppError(
            'This recipient has already used this voucher the maximum times',
            400
          );
        }
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
      throw new AppError(
        'No eligible items for this voucher on this channel — check selected items match the booking/order',
        400
      );
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

/** Find active vouchers assigned to any of the given identities (safe fields). */
export async function findVouchersForIdentities(
  tx: Prisma.TransactionClient | typeof import('./prisma').default,
  identities: ResolvedIdentity[]
) {
  if (identities.length === 0) return [];

  const or: any[] = identities.flatMap((i) => [
    { assignees: { some: { assigneeType: i.type, assigneeId: i.id } } },
    { assigneeType: i.type, assigneeId: i.id },
  ]);

  const vouchers = await (tx as any).voucher.findMany({
    where: {
      isActive: true,
      OR: or,
    },
    include: {
      assignees: true,
      _count: { select: { redemptions: true } },
    },
    orderBy: [{ expiresAt: 'asc' }, { createdAt: 'desc' }],
  });

  // Deduplicate by id
  const seen = new Set<string>();
  return vouchers.filter((v: any) => {
    if (seen.has(v.id)) return false;
    seen.add(v.id);
    return true;
  });
}
