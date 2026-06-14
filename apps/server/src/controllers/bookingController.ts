import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { bookingSchema, updateBookingSchema } from '../validators/bookingValidator';
import { AppError } from '../middleware/errorHandler';
import { emailService } from '../utils/emailService';

export const getAllBookings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { status, roomId, guestId, from, to } = req.query;

    const where: any = {};

    if (status) where.status = status;
    if (roomId) where.roomId = roomId;
    if (guestId) where.guestId = guestId;
    if (from || to) {
      // Filter by check-in date — most useful axis for an admin viewing the period.
      where.checkInDate = {};
      if (from) where.checkInDate.gte = new Date(from as string);
      if (to) {
        const end = new Date(to as string);
        end.setHours(23, 59, 59, 999);
        where.checkInDate.lte = end;
      }
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        room: true,
        guest: true,
        staff: true,
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, bookings });
  } catch (error) {
    next(error);
  }
};

export const getBooking = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        room: true,
        guest: true,
        staff: true,
        payments: true,
      },
    });

    if (!booking) {
      throw new AppError('Booking not found', 404);
    }

    res.json({ success: true, booking });
  } catch (error) {
    next(error);
  }
};

/** Match public booking: YYYY-MM-DD parses the same as `new Date(isoDate)`. */
function parseStayDate(raw: string): Date {
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return new Date(s);
  }
  return new Date(s);
}

export const createBooking = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = bookingSchema.parse(req.body);

    const checkIn = parseStayDate(data.checkInDate);
    const checkOut = parseStayDate(data.checkOutDate);

    if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime())) {
      throw new AppError('Invalid check-in or check-out date', 400);
    }

    if (checkOut <= checkIn) {
      throw new AppError('Check-out date must be after check-in date', 400);
    }

    // Check room availability
    const conflictingBookings = await prisma.booking.findMany({
      where: {
        roomId: data.roomId,
        status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
        OR: [
          {
            AND: [
              { checkInDate: { lte: checkOut } },
              { checkOutDate: { gte: checkIn } },
            ],
          },
        ],
      },
    });

    if (conflictingBookings.length > 0) {
      throw new AppError('Room is not available for the selected dates', 400);
    }

    // Calculate total amount
    const room = await prisma.room.findUnique({
      where: { id: data.roomId },
    });

    if (!room) {
      throw new AppError('Room not found', 404);
    }

    const days = Math.ceil(
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
    );
    const totalAmount = room.price * days;

    const {
      guestName,
      guestPhone,
      guestEmail,
      guestId: incomingGuestId,
      preferredPaymentTiming,
      preferredPaymentMethod,
      paymentTransactionId,
      paymentProofImage,
      status: requestedStatus,
      notes,
      ...rest
    } = data;

    let guestId = incomingGuestId?.trim() || undefined;
    if (!guestId) {
      const guest = await prisma.guest.create({
        data: {
          name: guestName!.trim(),
          phone: guestPhone!.trim(),
          email: guestEmail?.trim() || undefined,
        },
      });
      guestId = guest.id;
    }

    const status = requestedStatus ?? 'PENDING';

    const booking = await prisma.booking.create({
      data: {
        roomId: rest.roomId,
        guestId,
        adults: rest.adults,
        children: rest.children,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        totalAmount,
        status,
        staffId: req.user?.id,
        notes: notes?.trim() || undefined,
        preferredPaymentTiming: preferredPaymentTiming ?? undefined,
        preferredPaymentMethod:
          preferredPaymentTiming === 'INSTANT' ? preferredPaymentMethod ?? undefined : undefined,
        paymentTransactionId:
          preferredPaymentTiming === 'INSTANT' ? paymentTransactionId?.trim() : undefined,
        paymentProofImage:
          preferredPaymentTiming === 'INSTANT' ? paymentProofImage ?? undefined : undefined,
      },
      include: {
        room: true,
        guest: true,
        staff: true,
      },
    });

    if (status === 'CONFIRMED' || status === 'CHECKED_IN') {
      await prisma.room.update({
        where: { id: data.roomId },
        data: { status: 'BOOKED' },
      });
    }

    // Send booking confirmation email
    if (status === 'CONFIRMED' && booking.guest.email) {
      await emailService.sendBookingConfirmationEmail(booking.guest.email, {
        bookingId: booking.id,
        guestName: booking.guest.name,
        roomName: booking.room.name,
        checkInDate: booking.checkInDate.toLocaleDateString('en-GB'),
        checkOutDate: booking.checkOutDate.toLocaleDateString('en-GB'),
        totalAmount: booking.totalAmount,
        adults: booking.adults,
        children: booking.children,
      }).catch(err => console.error('Failed to send booking confirmation email:', err));
    }

    res.status(201).json({ success: true, booking });
  } catch (error) {
    next(error);
  }
};

export const updateBooking = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const data = updateBookingSchema.parse(req.body);

    const existing = await prisma.booking.findUnique({ where: { id } });
    if (!existing) throw new AppError('Booking not found', 404);

    const booking = await prisma.booking.update({
      where: { id },
      data,
      include: {
        room: true,
        guest: true,
        staff: true,
      },
    });

    // Update room status based on booking status
    if (data.status === 'CONFIRMED' || data.status === 'CHECKED_IN') {
      await prisma.room.update({
        where: { id: booking.roomId },
        data: { status: 'BOOKED' },
      });
      
      // Send booking confirmation email when status changes to CONFIRMED
      if (data.status === 'CONFIRMED' && booking.guest.email) {
        await emailService.sendBookingConfirmationEmail(booking.guest.email, {
          bookingId: booking.id,
          guestName: booking.guest.name,
          roomName: booking.room.name,
          checkInDate: booking.checkInDate.toLocaleDateString('en-GB'),
          checkOutDate: booking.checkOutDate.toLocaleDateString('en-GB'),
          totalAmount: booking.totalAmount,
          adults: booking.adults,
          children: booking.children,
        }).catch(err => console.error('Failed to send booking confirmation email:', err));
      }
    } else if (data.status === 'CHECKED_OUT') {
      await prisma.room.update({
        where: { id: booking.roomId },
        data: { status: 'CLEANING' },
      });
    } else if (data.status === 'CANCELLED') {
      await prisma.room.update({
        where: { id: booking.roomId },
        data: { status: 'AVAILABLE' },
      });
    }

    res.json({ success: true, booking });
  } catch (error) {
    next(error);
  }
};

export const deleteBooking = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking) throw new AppError('Booking not found', 404);

    // Delete related payments first to avoid FK constraint violation
    await prisma.payment.deleteMany({ where: { bookingId: id } });
    await prisma.booking.delete({ where: { id } });

    // Only mark room available if no other active bookings exist for it
    const activeBookings = await prisma.booking.count({
      where: {
        roomId: booking.roomId,
        status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
      },
    });
    if (activeBookings === 0) {
      await prisma.room.update({
        where: { id: booking.roomId },
        data: { status: 'AVAILABLE' },
      });
    }

    res.json({ success: true, message: 'Booking deleted successfully' });
  } catch (error) {
    next(error);
  }
};