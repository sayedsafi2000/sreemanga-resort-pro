import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { emailService } from '../utils/emailService';

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
    const {
      bookingId,
      amount,
      method,
      transactionId,
      notes,
    } = req.body;

    // Validate booking exists
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payments: true },
    });

    if (!booking) {
      throw new AppError('Booking not found', 404);
    }

    // Calculate total paid
    const totalPaid = booking.payments.reduce(
      (sum, p) => sum + p.amount,
      0
    );

    if (totalPaid + amount > booking.totalAmount) {
      throw new AppError(
        'Payment amount exceeds remaining balance',
        400
      );
    }

    const payment = await prisma.payment.create({
      data: {
        bookingId,
        amount,
        method,
        transactionId,
        notes,
        status: 'COMPLETED',
      },
      include: {
        booking: {
          include: {
            room: true,
            guest: true,
          },
        },
      },
    });

    // Check if fully paid — only upgrade status, never downgrade
    const newTotalPaid = totalPaid + amount;
    if (newTotalPaid >= booking.totalAmount && booking.status === 'PENDING') {
      await prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'CONFIRMED' },
      });
    }

    // Send payment confirmation email
    if (payment.booking.guest.email) {
      await emailService.sendPaymentConfirmationEmail(payment.booking.guest.email, {
        bookingId: payment.booking.id,
        guestName: payment.booking.guest.name,
        amount: payment.amount,
        method: payment.method,
        transactionId: payment.transactionId || undefined,
      }).catch(err => console.error('Failed to send payment confirmation email:', err));
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

    const payment = await prisma.payment.update({
      where: { id },
      data: {
        ...(status !== undefined ? { status } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(transactionId !== undefined ? { transactionId } : {}),
      },
      include: {
        booking: true,
      },
    });

    res.json({ success: true, payment });
  } catch (error) {
    next(error);
  }
};