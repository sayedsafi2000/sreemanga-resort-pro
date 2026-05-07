import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { guestSchema } from '../validators/guestValidator';
import { AppError } from '../middleware/errorHandler';

export const getAllGuests = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const guests = await prisma.guest.findMany({
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, guests });
  } catch (error) {
    next(error);
  }
};

export const getGuest = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const guest = await prisma.guest.findUnique({
      where: { id },
    });

    if (!guest) {
      throw new AppError('Guest not found', 404);
    }

    res.json({ success: true, guest });
  } catch (error) {
    next(error);
  }
};

export const createGuest = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = guestSchema.parse(req.body);

    const guest = await prisma.guest.create({
      data,
    });

    res.status(201).json({ success: true, guest });
  } catch (error) {
    next(error);
  }
};

export const updateGuest = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const data = guestSchema.partial().parse(req.body);

    const guest = await prisma.guest.update({
      where: { id },
      data,
    });

    res.json({ success: true, guest });
  } catch (error) {
    next(error);
  }
};

export const deleteGuest = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    await prisma.guest.delete({
      where: { id },
    });

    res.json({ success: true, message: 'Guest deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const getGuestHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const guest = await prisma.guest.findUnique({ where: { id } });
    if (!guest) {
      throw new AppError('Guest not found', 404);
    }

    const bookings = await prisma.booking.findMany({
      where: { guestId: id },
      include: {
        room: { select: { id: true, name: true, type: true } },
        payments: true,
      },
      orderBy: { checkInDate: 'desc' },
    });

    const payments = bookings.flatMap((b) =>
      b.payments.map((p) => ({
        ...p,
        bookingRoomName: b.room?.name ?? null,
        bookingCheckIn: b.checkInDate,
      }))
    );

    const totalSpend = payments
      .filter((p) => p.status === 'COMPLETED')
      .reduce((sum, p) => sum + p.amount, 0);

    const completedStays = bookings.filter(
      (b) => b.status === 'CHECKED_OUT'
    ).length;

    const lastStay = bookings.find((b) => b.status === 'CHECKED_OUT')?.checkOutDate ?? null;

    res.json({
      success: true,
      guest,
      bookings,
      payments,
      stats: {
        totalBookings: bookings.length,
        completedStays,
        totalSpend,
        lastStay,
      },
    });
  } catch (error) {
    next(error);
  }
};