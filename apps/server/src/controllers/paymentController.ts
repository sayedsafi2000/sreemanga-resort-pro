import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { emailService } from '../utils/emailService';
import { backfillMissingBookingPayments } from '../utils/bookingPayment';

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

      const totalPaid = booking.payments.reduce((s, p) => s + p.amount, 0);
      if (totalPaid + numAmount > booking.totalAmount) {
        throw new AppError('Payment amount exceeds remaining balance', 400);
      }

      const newPayment = await tx.payment.create({
        data: { bookingId, amount: numAmount, method, transactionId, notes, status: 'COMPLETED' },
        include: { booking: { include: { room: true, guest: true } } },
      });

      // Only upgrade PENDING → CONFIRMED, never downgrade
      if (totalPaid + numAmount >= booking.totalAmount && booking.status === 'PENDING') {
        await tx.booking.update({ where: { id: bookingId }, data: { status: 'CONFIRMED' } });
      }

      return newPayment;
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