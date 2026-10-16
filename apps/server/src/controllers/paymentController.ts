import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../utils/prisma';
import { formatInvoiceNo, round2 } from '../utils/bookingPricing';
import { AppError } from '../middleware/errorHandler';
import { emailService } from '../utils/emailService';
import { backfillMissingBookingPayments } from '../utils/bookingPayment';
import { recordRefund, recordRevenue } from '../utils/accountLedger';
import { computeNet, derivePaymentStatus } from '../utils/orderPayment';
import { isYmd, localNoon, nextLocalDay, parseYmdLocal, todayYmd, toYmdLocal } from '../utils/dateRange';
import { refundSchema, updatePaymentSchema } from '../validators/paymentValidator';

// Every payment read returns its booking (room + guest) and its refund history.
const PAYMENT_INCLUDE = {
  booking: { include: { room: true, guest: true } },
  refunds: { orderBy: { refundedAt: 'asc' as const } },
} as const;

/** Optional YYYY-MM-DD query param → trimmed value, or undefined when absent. 400 on garbage. */
function ymdQuery(raw: unknown, name: string): string | undefined {
  if (typeof raw !== 'string' || raw.trim() === '') return undefined;
  const s = raw.trim();
  if (!isYmd(s)) throw new AppError(`Invalid "${name}" date — expected YYYY-MM-DD`, 400);
  return s;
}

export const getAllPayments = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { status, method, bookingId, from, to } = req.query;

    const where: any = {};

    if (status) where.status = status;
    if (method) where.method = method;
    if (bookingId) where.bookingId = bookingId;
    if (from || to) {
      // Cash basis: filter on the local day the money arrived (paidAt), falling back to
      // createdAt for legacy and PENDING rows — the same rule the Financial Report uses.
      const range: any = {};
      if (isYmd(from)) range.gte = parseYmdLocal(from);
      else if (from) range.gte = new Date(String(from));
      if (isYmd(to)) range.lt = nextLocalDay(to);
      else if (to) {
        const end = new Date(String(to));
        end.setHours(23, 59, 59, 999);
        range.lte = end;
      }
      where.OR = [{ paidAt: range }, { paidAt: null, createdAt: range }];
    }

    const payments = await prisma.payment.findMany({
      where,
      include: PAYMENT_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, payments });
  } catch (error) {
    next(error);
  }
};

export const getPayment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: PAYMENT_INCLUDE,
    });

    if (!payment) {
      throw new AppError('Payment not found', 404);
    }

    res.json({ success: true, payment });
  } catch (error) {
    next(error);
  }
};

export const createPayment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { bookingId, amount, method, transactionId, notes } = req.body;

    if (!bookingId || !amount || !method) {
      throw new AppError('bookingId, amount, and method are required', 400);
    }
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new AppError('Amount must be a positive number', 400);
    }

    // Use transaction to prevent race condition on overpayment
    const payment = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: { payments: true, room: true, guest: true },
      });
      if (!booking) throw new AppError('Booking not found', 404);

      // Only COMPLETED counts toward paid — PENDING (website Instant/Later) must not block recording.
      // Refunded money is subtracted so it can be collected again.
      const totalPaid = booking.payments
        .filter((p) => p.status === 'COMPLETED')
        .reduce((s, p) => s + p.amount - p.refundedAmount, 0);
      const remaining = booking.totalAmount - totalPaid;
      if (numAmount > remaining + 0.001) {
        throw new AppError(
          `Payment amount exceeds remaining balance (৳${Math.max(0, remaining).toFixed(2)} due)`,
          400
        );
      }

      // Prefer completing a matching PENDING row (website Instant/Later) instead of duplicating.
      const matchingPending = booking.payments.find(
        (p) =>
          p.status === 'PENDING' && Math.abs(p.amount - numAmount) < 0.01
      );

      let completedPayment;
      if (matchingPending) {
        completedPayment = await tx.payment.update({
          where: { id: matchingPending.id },
          data: {
            status: 'COMPLETED',
            paidAt: new Date(),
            method,
            ...(transactionId !== undefined ? { transactionId } : {}),
            ...(notes !== undefined ? { notes } : {}),
            referenceType: matchingPending.referenceType || 'BOOKING',
            referenceId: matchingPending.referenceId || bookingId,
            businessLine: matchingPending.businessLine || 'ROOM',
          },
          include: { booking: { include: { room: true, guest: true } } },
        });
      } else {
        completedPayment = await tx.payment.create({
          data: {
            bookingId,
            amount: numAmount,
            method,
            transactionId,
            notes,
            status: 'COMPLETED',
            paidAt: new Date(),
            referenceType: 'BOOKING',
            referenceId: bookingId,
            businessLine: 'ROOM',
          },
          include: { booking: { include: { room: true, guest: true } } },
        });
      }

      // Only upgrade PENDING → CONFIRMED, never downgrade
      if (totalPaid + numAmount >= booking.totalAmount && booking.status === 'PENDING') {
        await tx.booking.update({ where: { id: bookingId }, data: { status: 'CONFIRMED' } });
      }

      // Ledger: cash IN + room income IN.
      await recordRevenue(tx, {
        amount: numAmount,
        method,
        businessLine: 'ROOM',
        referenceType: 'BOOKING',
        referenceId: bookingId,
        createdById: (req as any).user?.id,
      });

      return completedPayment;
    });

    // Send email outside transaction
    const cBooking = payment.booking;
    if (cBooking?.guest?.email) {
      emailService.sendPaymentConfirmationEmail(cBooking.guest.email, {
        bookingId: formatInvoiceNo(cBooking.invoiceNo),
        guestName: cBooking.guest.name,
        amount: payment.amount,
        method: payment.method,
        transactionId: payment.transactionId || undefined,
      }).catch(err => console.error('Payment email failed:', err));
    }

    res.status(201).json({ success: true, payment });
  } catch (error) {
    next(error);
  }
};

export const updatePayment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    // REFUNDED can no longer be set by hand — the Refund action records the amount and date.
    // Checked on the raw body so the caller gets this message instead of a generic enum error.
    if (req.body?.status === 'REFUNDED') {
      throw new AppError(
        'Use the Refund action on the payment so the refunded amount and date are recorded',
        400
      );
    }
    const { status, notes, transactionId } = updatePaymentSchema.parse(req.body);

    const payment = await prisma.$transaction(async (tx) => {
      const existing = await tx.payment.findUnique({
        where: { id },
        include: {
          booking: {
            include: { payments: true, guest: true, room: true },
          },
        },
      });
      if (!existing) throw new AppError('Payment not found', 404);
      if (existing.refundedAmount > 0 && status !== undefined && status !== 'COMPLETED') {
        throw new AppError('This payment has refunds recorded; it must stay COMPLETED', 400);
      }

      // Cash basis: stamp the moment the money is actually marked received.
      const becomesCompleted = status === 'COMPLETED' && existing.status !== 'COMPLETED';

      const updated = await tx.payment.update({
        where: { id },
        data: {
          ...(status !== undefined ? { status } : {}),
          ...(becomesCompleted ? { paidAt: new Date() } : {}),
          ...(notes !== undefined ? { notes } : {}),
          ...(transactionId !== undefined ? { transactionId } : {}),
        },
        include: {
          booking: {
            include: { payments: true, guest: true, room: true },
          },
          refunds: { orderBy: { refundedAt: 'asc' } },
        },
      });

      if (status === 'COMPLETED' && updated.booking && updated.booking.status === 'PENDING') {
        // Paid = COMPLETED payments net of their refunds.
        const totalPaid = updated.booking.payments.reduce((sum, p) => {
          if (p.id === updated.id) return sum + updated.amount - updated.refundedAmount;
          return sum + (p.status === 'COMPLETED' ? p.amount - p.refundedAmount : 0);
        }, 0);

        if (totalPaid >= updated.booking.totalAmount && updated.bookingId) {
          await tx.booking.update({
            where: { id: updated.bookingId },
            data: { status: 'CONFIRMED' },
          });
        }
      }

      // Record revenue when a PENDING payment first transitions to COMPLETED
      // (website pay-later bookings). Only fire on the state change.
      if (becomesCompleted && updated.bookingId) {
        await recordRevenue(tx, {
          amount: updated.amount,
          method: updated.method,
          businessLine: (updated.businessLine as string) || 'ROOM',
          referenceType: updated.referenceType || 'BOOKING',
          referenceId: updated.referenceId || updated.bookingId,
          createdById: (req as any).user?.id,
        });
      }

      return updated;
    });

    const uBooking = payment.booking;
    if (status === 'COMPLETED' && uBooking?.guest?.email) {
      emailService.sendPaymentConfirmationEmail(uBooking.guest.email, {
        bookingId: formatInvoiceNo(uBooking.invoiceNo),
        guestName: uBooking.guest.name,
        amount: payment.amount,
        method: payment.method,
        transactionId: payment.transactionId || undefined,
      }).catch((err) => console.error('Payment email failed:', err));
    }

    res.json({ success: true, payment });
  } catch (error) {
    next(error);
  }
};

// POST /:id/refund — return (part of) a COMPLETED payment to the guest. The payment keeps its
// COMPLETED status; the Refund row (cash basis on `refundedAt`) plus the denormalised
// `refundedAmount` carry the money back out. No email is sent.
export const refundPayment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const data = refundSchema.parse(req.body);
    const createdById = req.user?.id as string | undefined;
    const amount = round2(data.amount);

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id },
        include: { booking: { include: { guest: true, room: true } } },
      });
      if (!payment) throw new AppError('Payment not found', 404);
      if (payment.status !== 'COMPLETED') {
        throw new AppError('Only completed payments can be refunded', 400);
      }

      const remaining = round2(payment.amount - payment.refundedAmount);
      if (amount > remaining + 1e-6) {
        throw new AppError(
          `Refund exceeds the refundable balance (৳${Math.max(0, remaining).toFixed(2)})`,
          400
        );
      }

      // User-entered dates sit at local noon so viewers in other time zones see the same day.
      const refundedAt = data.date ? localNoon(data.date) : new Date();
      if (refundedAt >= nextLocalDay(todayYmd())) throw new AppError('Refund date cannot be in the future', 400);
      if (toYmdLocal(refundedAt) < toYmdLocal(payment.paidAt ?? payment.createdAt)) {
        throw new AppError('Refund date cannot be before the payment was received', 400);
      }
      const method = data.method ?? payment.method;
      // Snapshots so the Financial Report never needs a join back to the payment.
      const businessLine = payment.businessLine ?? (payment.bookingId ? 'ROOM' : null);
      const referenceType = payment.referenceType ?? (payment.bookingId ? 'BOOKING' : null);
      const referenceId = payment.referenceId ?? payment.bookingId;

      const refund = await tx.refund.create({
        data: {
          paymentId: payment.id,
          amount,
          method,
          reason: data.reason?.trim() || null,
          refundedAt,
          businessLine,
          referenceType,
          referenceId,
          createdById,
        },
      });

      // Race guard: two concurrent refunds can both pass the balance check above. The increment
      // is atomic, so re-reading the total and throwing rolls this one back.
      const bumped = await tx.payment.update({
        where: { id: payment.id },
        data: { refundedAmount: { increment: amount } },
        select: { refundedAmount: true },
      });
      if (bumped.refundedAmount > payment.amount + 1e-6) {
        throw new AppError(
          'Refund exceeds the refundable balance — another refund was recorded at the same time',
          409
        );
      }

      // Keep the referenced order / day-long booking's paid figures honest.
      if (referenceType === 'RESTAURANT_ORDER' && referenceId) {
        const order = await tx.restaurantOrder.findUnique({ where: { id: referenceId } });
        if (order) {
          const newPaid = round2(Math.max(0, order.paidAmount - amount));
          const net = order.netAmount ?? computeNet(order.totalPrice, order.discount, order.serviceCharge);
          await tx.restaurantOrder.update({
            where: { id: order.id },
            data: { paidAmount: newPaid, paymentStatus: derivePaymentStatus(newPaid, net) },
          });
        }
      } else if (referenceType === 'DAY_LONG_BOOKING' && referenceId) {
        const dayLong = await tx.dayLongBooking.findUnique({ where: { id: referenceId } });
        if (dayLong) {
          // Status is left alone — refunding money does not cancel the booking.
          await tx.dayLongBooking.update({
            where: { id: dayLong.id },
            data: { paidAmount: round2(Math.max(0, dayLong.paidAmount - amount)) },
          });
        }
      }

      // Ledger: cash OUT + income OUT (mirror image of recordRevenue).
      await recordRefund(tx, { amount, method, businessLine, refundId: refund.id, createdById });

      const fresh = await tx.payment.findUnique({ where: { id: payment.id }, include: PAYMENT_INCLUDE });
      return { refund, payment: fresh };
    });

    res.status(201).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

// DELETE /refunds/:id — undo a mis-keyed refund (SUPER_ADMIN). Restores the payment's refundedAmount,
// the referenced order / day-long paid figures and posts the mirror-image ledger entries.
export const deleteRefund = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const createdById = req.user?.id as string | undefined;
    await prisma.$transaction(async (tx) => {
      const refund = await tx.refund.findUnique({ where: { id }, include: { payment: true } });
      if (!refund) throw new AppError('Refund not found', 404);
      const amount = round2(refund.amount);
      await tx.refund.delete({ where: { id } });
      await tx.payment.update({
        where: { id: refund.paymentId },
        data: { refundedAmount: round2(Math.max(0, refund.payment.refundedAmount - amount)) },
      });
      if (refund.referenceType === 'RESTAURANT_ORDER' && refund.referenceId) {
        const order = await tx.restaurantOrder.findUnique({ where: { id: refund.referenceId } });
        if (order) {
          const net = order.netAmount ?? computeNet(order.totalPrice, order.discount, order.serviceCharge);
          const newPaid = round2(Math.min(net, order.paidAmount + amount));
          await tx.restaurantOrder.update({
            where: { id: order.id },
            data: { paidAmount: newPaid, paymentStatus: derivePaymentStatus(newPaid, net) },
          });
        }
      } else if (refund.referenceType === 'DAY_LONG_BOOKING' && refund.referenceId) {
        const dayLong = await tx.dayLongBooking.findUnique({ where: { id: refund.referenceId } });
        if (dayLong) {
          await tx.dayLongBooking.update({
            where: { id: dayLong.id },
            data: { paidAmount: round2(Math.min(dayLong.totalAmount, dayLong.paidAmount + amount)) },
          });
        }
      }
      await recordRefund(tx, {
        amount,
        method: refund.method,
        businessLine: refund.businessLine,
        refundId: refund.id,
        createdById,
        reverse: true,
      });
    });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// GET /refunds?from&to — refunds by `refundedAt` (local days, both bounds optional).
export const listRefunds = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const from = ymdQuery(req.query.from, 'from');
    const to = ymdQuery(req.query.to, 'to');
    if (from && to && from > to) throw new AppError('"from" must not be after "to"', 400);

    const where: Prisma.RefundWhereInput = {};
    if (from || to) {
      where.refundedAt = {
        ...(from ? { gte: parseYmdLocal(from) } : {}),
        ...(to ? { lt: nextLocalDay(to) } : {}),
      };
    }

    const refunds = await prisma.refund.findMany({
      where,
      include: {
        payment: {
          select: {
            id: true,
            amount: true,
            method: true,
            bookingId: true,
            referenceType: true,
            referenceId: true,
            booking: { select: { invoiceNo: true, guest: { select: { name: true } } } },
          },
        },
      },
      orderBy: { refundedAt: 'desc' },
    });
    const total = round2(refunds.reduce((sum, r) => sum + r.amount, 0));

    res.json({ success: true, refunds, total });
  } catch (error) {
    next(error);
  }
};

// Explicit backfill (Phase 0.5): create Payment rows for older website bookings
// that only stored payment info on the Booking. Moved off the GET path — call on demand.
export const backfillPayments = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const created = await backfillMissingBookingPayments();
    res.json({ success: true, created });
  } catch (error) {
    next(error);
  }
};
