import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

export const getRevenueReport = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { startDate, endDate } = req.query;

    const where: any = {
      status: 'COMPLETED',
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        booking: {
          include: {
            room: true,
          },
        },
      },
    });

    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalBookings = new Set(
      payments.map((p) => p.bookingId)
    ).size;

    // Group by date
    const revenueByDate: Record<string, number> = {};
    payments.forEach((p) => {
      const date = p.createdAt.toISOString().split('T')[0];
      revenueByDate[date] = (revenueByDate[date] || 0) + p.amount;
    });

    // Group by room type
    const revenueByRoomType: Record<string, number> = {};
    payments.forEach((p) => {
      const type = p.booking.room.type;
      revenueByRoomType[type] =
        (revenueByRoomType[type] || 0) + p.amount;
    });

    res.json({
      success: true,
      totalRevenue,
      totalBookings,
      revenueByDate,
      revenueByRoomType,
      payments,
    });
  } catch (error) {
    next(error);
  }
};

export const getOccupancyReport = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { startDate, endDate } = req.query;

    const totalRooms = await prisma.room.count();

    const bookings = await prisma.booking.findMany({
      where: {
        status: { in: ['CONFIRMED', 'CHECKED_IN'] },
        ...(startDate || endDate
          ? {
              OR: [
                {
                  AND: [
                    { checkInDate: { lte: endDate ? new Date(endDate as string) : new Date() } },
                    { checkOutDate: { gte: startDate ? new Date(startDate as string) : new Date() } },
                  ],
                },
              ],
          }
          : {}),
      },
    });

    const occupiedRoomNights = bookings.reduce((sum, booking) => {
      const checkIn = new Date(booking.checkInDate);
      const checkOut = new Date(booking.checkOutDate);
      const nights = Math.ceil(
        (checkOut.getTime() - checkIn.getTime()) /
          (1000 * 60 * 60 * 24)
      );
      return sum + nights;
    }, 0);

    const totalDays = startDate && endDate
      ? Math.ceil(
          (new Date(endDate as string).getTime() -
            new Date(startDate as string).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : 30;

    const totalRoomNights = totalRooms * totalDays;
    const occupancyRate =
      totalRoomNights > 0
        ? (occupiedRoomNights / totalRoomNights) * 100
        : 0;

    res.json({
      success: true,
      totalRooms,
      occupiedRoomNights,
      totalRoomNights,
      occupancyRate: Math.round(occupancyRate * 100) / 100,
      bookings,
    });
  } catch (error) {
    next(error);
  }
};

export const getExpenseReport = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { startDate, endDate } = req.query;

    const where: any = { status: 'PAID' };
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: { category: true },
    });

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    const expensesByDate: Record<string, number> = {};
    expenses.forEach((e) => {
      const date = e.date.toISOString().split('T')[0];
      expensesByDate[date] = (expensesByDate[date] || 0) + e.amount;
    });

    const expensesByCategory: Record<string, number> = {};
    expenses.forEach((e) => {
      const name = e.category?.name || 'Uncategorized';
      expensesByCategory[name] = (expensesByCategory[name] || 0) + e.amount;
    });

    res.json({
      success: true,
      totalExpenses,
      totalCount: expenses.length,
      expensesByDate,
      expensesByCategory,
    });
  } catch (error) {
    next(error);
  }
};

export const getBookingStats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { startDate, endDate } = req.query;

    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const bookings = await prisma.booking.findMany({
      where,
    });

    const totalBookings = bookings.length;
    const confirmedBookings = bookings.filter(
      (b) => b.status === 'CONFIRMED'
    ).length;
    const checkedInBookings = bookings.filter(
      (b) => b.status === 'CHECKED_IN'
    ).length;
    const checkedOutBookings = bookings.filter(
      (b) => b.status === 'CHECKED_OUT'
    ).length;
    const cancelledBookings = bookings.filter(
      (b) => b.status === 'CANCELLED'
    ).length;

    res.json({
      success: true,
      totalBookings,
      confirmedBookings,
      checkedInBookings,
      checkedOutBookings,
      cancelledBookings,
      bookings,
    });
  } catch (error) {
    next(error);
  }
};