import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler';
import { recordRevenue } from '../utils/accountLedger';
import { consumeForOrder } from '../utils/inventory';
import { recordVoucherRedemption, validateVoucherForCheckout } from '../utils/voucher';

// netAmount = totalPrice - discount + serviceCharge (never below 0)
function computeNet(totalPrice: number, discount: number, serviceCharge: number): number {
  return Math.max(0, totalPrice - discount + serviceCharge);
}

function derivePaymentStatus(paid: number, net: number): 'UNPAID' | 'PARTIAL' | 'PAID' {
  if (paid <= 0) return 'UNPAID';
  if (paid >= net) return 'PAID';
  return 'PARTIAL';
}

const menuSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  price: z.number().positive('Price must be positive'),
  category: z.string(),
  description: z.string().optional(),
  /** URL, site path, or data URL — or `null` on update to remove. */
  image: z.union([z.string().max(12_000_000), z.null()]).optional(),
  isAvailable: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

const orderSchema = z.object({
  roomId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  items: z.array(z.any()),
  totalPrice: z.number().positive(),
  discount: z.number().nonnegative().optional(),
  serviceCharge: z.number().nonnegative().optional(),
  notes: z.string().optional(),
  voucherCode: z.string().min(1).optional(),
  guestEmail: z.string().email().optional().nullable(),
});

const orderUpdateSchema = z.object({
  status: z.enum(['PENDING', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED']).optional(),
  items: z.array(z.any()).optional(),
  totalPrice: z.number().positive().optional(),
  discount: z.number().nonnegative().optional(),
  serviceCharge: z.number().nonnegative().optional(),
  notes: z.string().optional().nullable(),
  userId: z.string().uuid().optional().nullable(),
  roomId: z.string().uuid().optional().nullable(),
  voucherCode: z.string().min(1).optional().nullable(),
  guestEmail: z.string().email().optional().nullable(),
});

const orderPaymentSchema = z.object({
  amount: z.number().positive(),
  method: z.enum(['CASH', 'BKASH', 'NAGAD', 'CARD', 'BANK_TRANSFER', 'MOBILE_BANKING']),
  transactionId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const getAllMenuItems = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { category, available } = req.query;

    const where: any = {};

    if (category) where.category = category;
    if (available === 'true') where.isAvailable = true;

    const menuItems = await prisma.restaurantMenu.findMany({
      where,
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    });

    res.json({ success: true, menuItems });
  } catch (error) {
    next(error);
  }
};

export const getMenuItem = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const menuItem = await prisma.restaurantMenu.findUnique({
      where: { id },
    });

    if (!menuItem) {
      throw new AppError('Menu item not found', 404);
    }

    res.json({ success: true, menuItem });
  } catch (error) {
    next(error);
  }
};

export const createMenuItem = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = menuSchema.parse(req.body);

    const menuItem = await prisma.restaurantMenu.create({
      data: {
        ...data,
        isAvailable: data.isAvailable ?? true,
      },
    });

    res.status(201).json({ success: true, menuItem });
  } catch (error) {
    next(error);
  }
};

export const updateMenuItem = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const data = menuSchema.partial().parse(req.body);

    const existing = await prisma.restaurantMenu.findUnique({ where: { id } });
    if (!existing) throw new AppError('Menu item not found', 404);

    const menuItem = await prisma.restaurantMenu.update({ where: { id }, data });
    res.json({ success: true, menuItem });
  } catch (error) {
    next(error);
  }
};

export const deleteMenuItem = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const existing = await prisma.restaurantMenu.findUnique({ where: { id } });
    if (!existing) throw new AppError('Menu item not found', 404);

    await prisma.restaurantMenu.delete({ where: { id } });
    res.json({ success: true, message: 'Menu item deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const createOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = orderSchema.parse(req.body);

    const serviceCharge = data.serviceCharge ?? 0;
    const lineItems = (Array.isArray(data.items) ? data.items : [])
      .map((it: any) => ({
        itemType: 'MENU_ITEM' as const,
        itemId: String(it.menuItemId || it.id || ''),
        amount: Number(it.price || 0) * Number(it.quantity || 1),
      }))
      .filter((li) => li.itemId && li.amount > 0);

    const order = await prisma.$transaction(async (tx) => {
      let discount = data.discount ?? 0;
      let voucherId: string | undefined;

      if (data.voucherCode?.trim()) {
        const applied = await validateVoucherForCheckout(tx, {
          code: data.voucherCode,
          channel: 'RESTAURANT',
          grossAmount: data.totalPrice,
          lineItems,
          assignee: {
            userId: data.userId || req.user?.id,
            guestEmail: data.guestEmail ?? null,
          },
        });
        discount = applied.discountAmount;
        voucherId = applied.voucher.id;
      }

      const netAmount = computeNet(data.totalPrice, discount, serviceCharge);
      const created = await tx.restaurantOrder.create({
        data: {
          roomId: data.roomId,
          userId: data.userId,
          items: data.items,
          totalPrice: data.totalPrice,
          discount,
          serviceCharge,
          netAmount,
          voucherId,
          status: 'PENDING',
          paymentStatus: 'UNPAID',
          notes: data.notes,
        },
      });

      if (voucherId && discount > 0) {
        await recordVoucherRedemption(tx, {
          voucherId,
          amountDiscounted: discount,
          referenceType: 'RESTAURANT_ORDER',
          referenceId: created.id,
          redeemedById: req.user?.id,
          guestEmail: data.guestEmail ?? null,
          source: 'ADMIN',
          channel: 'RESTAURANT',
        });
      }

      return created;
    });

    res.status(201).json({ success: true, order });
  } catch (error) {
    next(error);
  }
};

export const getOrders = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { status, roomId, from, to } = req.query;

    const where: any = {};

    if (status) where.status = status;
    if (roomId) where.roomId = roomId;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from as string);
      if (to) {
        const end = new Date(to as string);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const orders = await prisma.restaurantOrder.findMany({
      where,
      include: {
        room: true,
        user: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, orders });
  } catch (error) {
    next(error);
  }
};

export const updateOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const data = orderUpdateSchema.parse(req.body);

    const existing = await prisma.restaurantOrder.findUnique({ where: { id } });
    if (!existing) throw new AppError('Order not found', 404);

    // Recompute net + payment status when any amount component changes.
    let discount = data.discount ?? existing.discount;
    let voucherId = existing.voucherId;
    const totalPrice = data.totalPrice ?? existing.totalPrice;
    const serviceCharge = data.serviceCharge ?? existing.serviceCharge;
    const items = data.items ?? existing.items;

    const order = await prisma.$transaction(async (tx) => {
      if (data.voucherCode?.trim()) {
        const lineItems = (Array.isArray(items) ? items : [])
          .map((it: any) => ({
            itemType: 'MENU_ITEM' as const,
            itemId: String(it.menuItemId || it.id || ''),
            amount: Number(it.price || 0) * Number(it.quantity || 1),
          }))
          .filter((li) => li.itemId && li.amount > 0);
        const applied = await validateVoucherForCheckout(tx, {
          code: data.voucherCode,
          channel: 'RESTAURANT',
          grossAmount: totalPrice,
          lineItems,
          assignee: {
            userId: data.userId || existing.userId || req.user?.id,
            guestEmail: data.guestEmail ?? null,
          },
        });
        discount = applied.discountAmount;
        voucherId = applied.voucher.id;
        if (!existing.voucherId || existing.voucherId !== voucherId) {
          await recordVoucherRedemption(tx, {
            voucherId,
            amountDiscounted: discount,
            referenceType: 'RESTAURANT_ORDER',
            referenceId: id,
            redeemedById: req.user?.id,
            guestEmail: data.guestEmail ?? null,
            source: 'ADMIN',
            channel: 'RESTAURANT',
          });
        }
      }

      const totalsChanged =
        data.totalPrice !== undefined ||
        data.discount !== undefined ||
        data.serviceCharge !== undefined ||
        !!data.voucherCode;
      const netAmount = computeNet(totalPrice, discount, serviceCharge);

      return tx.restaurantOrder.update({
        where: { id },
        data: {
          ...(data.status !== undefined ? { status: data.status } : {}),
          ...(data.items !== undefined ? { items: data.items } : {}),
          ...(data.totalPrice !== undefined ? { totalPrice: data.totalPrice } : {}),
          ...(data.discount !== undefined || data.voucherCode
            ? { discount }
            : {}),
          ...(data.serviceCharge !== undefined ? { serviceCharge: data.serviceCharge } : {}),
          ...(data.voucherCode ? { voucherId } : {}),
          ...(totalsChanged
            ? { netAmount, paymentStatus: derivePaymentStatus(existing.paidAmount, netAmount) }
            : {}),
          ...(data.notes !== undefined ? { notes: data.notes } : {}),
          ...(data.userId !== undefined ? { userId: data.userId } : {}),
          ...(data.roomId !== undefined ? { roomId: data.roomId } : {}),
        },
        include: { room: true, user: true },
      });
    });

    res.json({ success: true, order });
  } catch (error) {
    next(error);
  }
};

// Record a payment against an order (POS + allow pending). Full or partial.
export const recordOrderPayment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const data = orderPaymentSchema.parse(req.body);

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.restaurantOrder.findUnique({ where: { id } });
      if (!order) throw new AppError('Order not found', 404);
      if (order.status === 'CANCELLED') throw new AppError('Cannot pay a cancelled order', 400);

      const net = order.netAmount ?? computeNet(order.totalPrice, order.discount, order.serviceCharge);
      const balance = net - order.paidAmount;
      if (data.amount > balance + 0.001) {
        throw new AppError(`Payment exceeds balance due (৳${balance.toFixed(2)})`, 400);
      }

      const payment = await tx.payment.create({
        data: {
          amount: data.amount,
          method: data.method,
          status: 'COMPLETED',
          transactionId: data.transactionId || undefined,
          notes: data.notes || undefined,
          referenceType: 'RESTAURANT_ORDER',
          referenceId: order.id,
          businessLine: 'RESTAURANT',
        },
      });

      const paidAmount = order.paidAmount + data.amount;
      const updated = await tx.restaurantOrder.update({
        where: { id },
        data: {
          paidAmount,
          netAmount: net,
          paymentStatus: derivePaymentStatus(paidAmount, net),
        },
        include: { room: true, user: true },
      });

      // Ledger (no-op until Phase 4): cash IN + restaurant income IN.
      await recordRevenue(tx, {
        amount: data.amount,
        method: data.method,
        businessLine: 'RESTAURANT',
        referenceType: 'RESTAURANT_ORDER',
        referenceId: order.id,
        createdById: req.user?.id,
      });

      // Auto-deduct inventory on first payment (idempotent per order).
      const items = Array.isArray(order.items) ? (order.items as any[]) : [];
      await consumeForOrder(tx, order.id, items, req.user?.id);

      return { order: updated, payment };
    });

    res.status(201).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const getOrderPayments = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const payments = await prisma.payment.findMany({
      where: { referenceType: 'RESTAURANT_ORDER', referenceId: id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, payments });
  } catch (error) {
    next(error);
  }
};