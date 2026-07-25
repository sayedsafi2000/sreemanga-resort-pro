import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { emailService } from '../utils/emailService';
import { backfillMissingBookingPayments } from '../utils/bookingPayment';
import { recordRevenue } from '../utils/accountLedger';

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
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from as string);
      if (to) {
        const end = new Date(to as string);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        booking: {
          include: {
            room: true,
            guest: true,
          },
        },
      },
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
      include: {
        booking: {
          include: {
            room: true,
            guest: true,
          },
        },
      },
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
      const totalPaid = booking.payments
        .filter((p) => p.status === 'COMPLETED')
        .reduce((s, p) => s + p.amount, 0);
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
        bookingId: cBooking.id,
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
    const { status, notes, transactionId } = req.body;

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

      const updated = await tx.payment.update({
        where: { id },
        data: {
          ...(status !== undefined ? { status } : {}),
          ...(notes !== undefined ? { notes } : {}),
          ...(transactionId !== undefined ? { transactionId } : {}),
        },
        include: {
          booking: {
            include: { payments: true, guest: true, room: true },
          },
        },
      });

      if (status === 'COMPLETED' && updated.booking && updated.booking.status === 'PENDING') {
        const totalPaid = updated.booking.payments.reduce((sum, p) => {
          if (p.id === updated.id) return sum + updated.amount;
          return sum + (p.status === 'COMPLETED' ? p.amount : 0);
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
      if (status === 'COMPLETED' && existing.status !== 'COMPLETED' && updated.bookingId) {
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
        bookingId: uBooking.id,
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