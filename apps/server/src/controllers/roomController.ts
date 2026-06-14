import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { roomSchema } from '../validators/roomValidator';
import { AppError } from '../middleware/errorHandler';

function pruneValue(value: any): any {
  if (Array.isArray(value)) {
    const next = value.map(pruneValue).filter((v) => v !== undefined);
    return next.length ? next : undefined;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value)
      .map(([k, v]) => [k, pruneValue(v)] as const)
      .filter(([, v]) => v !== undefined);
    return entries.length ? Object.fromEntries(entries) : undefined;
  }
  if (value === '' || value === null || value === undefined) return undefined;
  if (value === false) return undefined;
  return value;
}

export const getAllRooms = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { status, type, minPrice, maxPrice } = req.query;

    const where: any = {};

    if (status) where.status = status;
    if (type) where.type = type;
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice as string);
      if (maxPrice) where.price.lte = parseFloat(maxPrice as string);
    }

    const rooms = await prisma.room.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, rooms });
  } catch (error) {
    next(error);
  }
};

export const getRoom = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const room = await prisma.room.findUnique({
      where: { id },
    });

    if (!room) {
      throw new AppError('Room not found', 404);
    }

    res.json({ success: true, room });
  } catch (error) {
    next(error);
  }
};

export const createRoom = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = roomSchema.parse(req.body);
    const payload = pruneValue({
      ...data,
      capacity: data.capacity ?? data.maxAdults ?? 1,
      status: data.status || 'AVAILABLE',
    });

    const room = await prisma.room.create({
      data: payload,
    });

    res.status(201).json({ success: true, room });
  } catch (error) {
    next(error);
  }
};

export const updateRoom = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const data = roomSchema.partial().parse(req.body);
    const payload = pruneValue(data);

    const existing = await prisma.room.findUnique({ where: { id } });
    if (!existing) throw new AppError('Room not found', 404);

    if (req.user?.role === 'HOUSEKEEPING') {
      const keys = Object.keys(payload || {}).filter((k) => payload[k as keyof typeof payload] !== undefined);
      if (keys.length === 0 || keys.some((k) => k !== 'status')) {
        throw new AppError('Housekeeping can only update room status', 403);
      }
    }

    const room = await prisma.room.update({
      where: { id },
      data: payload,
    });

    res.json({ success: true, room });
  } catch (error) {
    next(error);
  }
};

export const deleteRoom = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const existing = await prisma.room.findUnique({ where: { id } });
    if (!existing) throw new AppError('Room not found', 404);

    // Delete dependent bookings and their payments first
    const bookings = await prisma.booking.findMany({ where: { roomId: id }, select: { id: true } });
    for (const b of bookings) {
      await prisma.payment.deleteMany({ where: { bookingId: b.id } });
    }
    await prisma.booking.deleteMany({ where: { roomId: id } });

    await prisma.room.delete({ where: { id } });

    res.json({ success: true, message: 'Room deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const checkAvailability = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { checkInDate, checkOutDate } = req.query;

    if (!checkInDate || !checkOutDate) {
      throw new AppError('Check-in and check-out dates are required', 400);
    }

    const checkIn = new Date(checkInDate as string);
    const checkOut = new Date(checkOutDate as string);

    // Find rooms that are not booked in the given date range
    const bookedRooms = await prisma.booking.findMany({
      where: {
        OR: [
          {
            AND: [
              { checkInDate: { lte: checkOut } },
              { checkOutDate: { gte: checkIn } },
              { status: { in: ['CONFIRMED', 'CHECKED_IN'] } },
            ],
          },
        ],
      },
      select: { roomId: true },
    });

    const bookedRoomIds = bookedRooms.map((b) => b.roomId);

    const availableRooms = await prisma.room.findMany({
      where: {
        status: 'AVAILABLE',
        id: { notIn: bookedRoomIds },
      },
    });

    res.json({ success: true, rooms: availableRooms });
  } catch (error) {
    next(error);
  }
};