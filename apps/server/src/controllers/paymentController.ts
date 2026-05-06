import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

export const getAllPayments = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { status, method, bookingId } = req.query;

    const where: any = {};

    if (status) where.status = status;
    if (method) where.method = method;
    if (bookingId) where.bookingId = bookingId;

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

    // Check if fully paid
    const newTotalPaid = totalPaid + amount;
    if (newTotalPaid >= booking.totalAmount) {
      await prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'CONFIRMED' },
      });
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
    const { status, notes } = req.body;

    const payment = await prisma.payment.update({
      where: { id },
      data: { status, notes },
      include: {
        booking: true,
      },
    });

    res.json({ success: true, payment });
  } catch (error) {
    next(error);
  }
};