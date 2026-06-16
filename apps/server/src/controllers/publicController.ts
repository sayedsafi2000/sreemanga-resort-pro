import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { z } from 'zod';
import { createPaymentFromBooking } from '../utils/bookingPayment';
import { emailService } from '../utils/emailService';
import crypto from 'crypto';

// ── In-memory OTP store ────────────────────────────────────────────────────
// Map key: email  →  { otp, expiresAt, verified }
interface OtpEntry { otp: string; expiresAt: number; verified: boolean; }
const otpStore = new Map<string, OtpEntry>();

// Clean up expired entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of otpStore.entries()) {
    if (val.expiresAt < now) otpStore.delete(key);
  }
}, 10 * 60 * 1000);

export const getPublicRooms = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, minPrice, maxPrice } = req.query;
    const where: any = {};
    if (type) where.type = type;
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice as string);
      if (maxPrice) where.price.lte = parseFloat(maxPrice as string);
    }
    const rooms = await prisma.room.findMany({ where, orderBy: { price: 'asc' } });
    res.json({ success: true, rooms });
  } catch (error) { next(error); }
};

export const getPublicRoom = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const room = await prisma.room.findUnique({ where: { id } });
    if (!room) throw new AppError('Room not found', 404);
    res.json({ success: true, room });
  } catch (error) { next(error); }
};

export const checkRoomAvailability = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { checkInDate, checkOutDate } = req.query;
    if (!checkInDate || !checkOutDate) throw new AppError('Check-in and check-out dates are required', 400);
    const checkIn = new Date(checkInDate as string);
    const checkOut = new Date(checkOutDate as string);
    const bookedRooms = await prisma.booking.findMany({
      where: {
        status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
        AND: [
          { checkInDate: { lte: checkOut } },
          { checkOutDate: { gte: checkIn } },
        ],
      },
      select: { roomId: true },
    });
    const bookedRoomIds = [...new Set(bookedRooms.map(b => b.roomId))];
    const availableRooms = await prisma.room.findMany({
      where: { id: { notIn: bookedRoomIds } },
    });
    res.json({ success: true, rooms: availableRooms });
  } catch (error) { next(error); }
};

export const getAvailabilityCalendar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { roomId, from, days } = req.query;
    const parsedDays = Math.min(Math.max(Number(days ?? 60), 1), 90);
    const start = from ? new Date(from as string) : new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + parsedDays - 1);
    end.setHours(23, 59, 59, 999);

    const roomsWhere = roomId ? { id: String(roomId) } : {};
    const rooms = await prisma.room.findMany({
      where: roomsWhere,
      select: { id: true, name: true, status: true },
      orderBy: { name: 'asc' },
    });

    const roomIds = rooms.map((r) => r.id);
    if (roomIds.length === 0) {
      res.json({ success: true, from: start.toISOString(), days: parsedDays, rooms: [] });
      return;
    }

    const bookings = await prisma.booking.findMany({
      where: {
        roomId: { in: roomIds },
        status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
        AND: [{ checkInDate: { lte: end } }, { checkOutDate: { gte: start } }],
      },
      select: {
        roomId: true,
        checkInDate: true,
        checkOutDate: true,
        status: true,
      },
    });

    const toIsoDate = (d: Date) => d.toISOString().slice(0, 10);
    const dates = Array.from({ length: parsedDays }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return toIsoDate(d);
    });

    const byRoom = new Map<string, typeof bookings>();
    roomIds.forEach((id) => byRoom.set(id, []));
    bookings.forEach((b) => byRoom.get(b.roomId)?.push(b));

    const roomsCalendar = rooms.map((room) => {
      const roomBookings = byRoom.get(room.id) || [];
      const availability = dates.map((date) => {
        const d = new Date(`${date}T12:00:00.000Z`);
        const matched = roomBookings.find(
          (b) => b.checkInDate <= d && b.checkOutDate >= d
        );
        return {
          date,
          status: matched ? 'BOOKED' : 'FREE',
          bookingStatus: matched?.status || null,
        };
      });
      return {
        roomId: room.id,
        roomName: room.name,
        roomStatus: room.status,
        availability,
      };
    });

    res.json({
      success: true,
      from: start.toISOString(),
      days: parsedDays,
      rooms: roomsCalendar,
    });
  } catch (error) {
    next(error);
  }
};

export const getPublicSettings = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await prisma.setting.findMany();
    const settingsMap: Record<string, string> = {};
    settings.forEach(s => { settingsMap[s.key] = s.value; });
    res.json({ success: true, settings: settingsMap });
  } catch (error) { next(error); }
};

export const getPublicMenu = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category } = req.query;
    const where: any = { isAvailable: true };
    if (category) where.category = category;
    const menuItems = await prisma.restaurantMenu.findMany({
      where,
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    });
    res.json({ success: true, menuItems });
  } catch (error) { next(error); }
};

const publicBookingSchema = z.object({
  roomId: z.string().uuid(),
  guestName: z.string().min(2),
  guestPhone: z.string().min(10),
  guestEmail: z.string().email().optional(),
  adults: z.number().int().min(1).max(20).default(1),
  children: z.number().int().min(0).max(20).default(0),
  preferredPaymentTiming: z.enum(['INSTANT', 'LATER']).default('LATER'),
  preferredPaymentMethod: z.enum(['BKASH', 'BANK_TRANSFER']).optional(),
  paymentTransactionId: z.string().min(4).max(100).optional(),
  paymentProofImage: z.string().optional(),
  guestNid: z.string().optional(),
  guestAddress: z.string().optional(),
  checkInDate: z.string(),
  checkOutDate: z.string(),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.preferredPaymentTiming === 'INSTANT' && !data.preferredPaymentMethod) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Payment method is required for instant payment',
      path: ['preferredPaymentMethod'],
    });
  }
  if (data.preferredPaymentTiming === 'INSTANT' && !data.paymentTransactionId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Transaction ID is required for instant payment',
      path: ['paymentTransactionId'],
    });
  }
});

export const createPublicBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = publicBookingSchema.parse(req.body);

    // ── OTP guard ────────────────────────────────────────────────────────────
    if (data.guestEmail) {
      const entry = otpStore.get(data.guestEmail.toLowerCase());
      if (!entry || !entry.verified || entry.expiresAt < Date.now()) {
        throw new AppError('Email OTP not verified. Please verify your email before booking.', 403);
      }
      // Invalidate OTP after use so it can't be replayed
      otpStore.delete(data.guestEmail.toLowerCase());
    }
    // ────────────────────────────────────────────────────────────────────────

    const checkIn = new Date(data.checkInDate);
    const checkOut = new Date(data.checkOutDate);
    if (checkOut <= checkIn) throw new AppError('Check-out date must be after check-in date', 400);

    const room = await prisma.room.findUnique({ where: { id: data.roomId } });
    if (!room) throw new AppError('Room not found', 404);

    const conflictingBookings = await prisma.booking.findMany({
      where: {
        roomId: data.roomId,
        status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
        AND: [
          { checkInDate: { lte: checkOut } },
          { checkOutDate: { gte: checkIn } },
        ],
      },
    });
    if (conflictingBookings.length > 0) throw new AppError('Room is not available for the selected dates', 400);

    const days = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    const totalAmount = room.price * days;

    const result = await prisma.$transaction(async (tx) => {
      const guest = await tx.guest.create({
        data: {
          name: data.guestName,
          phone: data.guestPhone,
          email: data.guestEmail,
          nid: data.guestNid,
          address: data.guestAddress,
        },
      });

      const bookingData = {
        roomId: data.roomId,
        guestId: guest.id,
        adults: data.adults,
        children: data.children,
        preferredPaymentTiming: data.preferredPaymentTiming,
        preferredPaymentMethod: data.preferredPaymentMethod,
        paymentTransactionId: data.paymentTransactionId,
        paymentProofImage: data.paymentProofImage,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        totalAmount,
        status: 'PENDING',
        notes: data.notes,
      } as any;

      const booking = await tx.booking.create({
        data: bookingData,
        include: { room: true, guest: true },
      });

      await createPaymentFromBooking(tx, booking);

      return booking;
    });

    res.status(201).json({ success: true, booking: result });

    // Send pending acknowledgment email to guest (fire-and-forget)
    if (result.guest.email) {
      emailService.sendBookingPendingEmail(result.guest.email, {
        bookingId: result.id,
        guestName: result.guest.name,
        roomName: result.room.name,
        checkInDate: result.checkInDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
        checkOutDate: result.checkOutDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
        totalAmount: result.totalAmount,
      }).catch(err => console.error('[Email] Pending booking email failed:', err));
    }
  } catch (error) { next(error); }
};

// ── Send OTP ──────────────────────────────────────────────────────────────
export const sendOtp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      throw new AppError('Valid email is required', 400);
    }
    const normalised = email.toLowerCase().trim();

    // Rate-limit: don't allow resend within 60 seconds
    const existing = otpStore.get(normalised);
    if (existing && existing.expiresAt - 4 * 60 * 1000 > Date.now()) {
      throw new AppError('Please wait before requesting a new OTP', 429);
    }

    // Generate 6-digit OTP
    const otp = String(Math.floor(100000 + crypto.randomInt(900000)));
    otpStore.set(normalised, {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
      verified: false,
    });

    const sent = await emailService.sendOtpEmail(normalised, otp);

    if (!sent) throw new AppError('Failed to send OTP email. Please try again.', 500);

    res.json({ success: true, message: 'OTP sent to your email.' });
  } catch (error) { next(error); }
};

// ── Verify OTP ────────────────────────────────────────────────────────────
export const verifyOtp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) throw new AppError('Email and OTP are required', 400);

    const normalised = email.toLowerCase().trim();
    const entry = otpStore.get(normalised);

    if (!entry) throw new AppError('OTP not found. Please request a new one.', 400);
    if (entry.expiresAt < Date.now()) {
      otpStore.delete(normalised);
      throw new AppError('OTP has expired. Please request a new one.', 400);
    }
    if (entry.otp !== String(otp).trim()) {
      throw new AppError('Incorrect OTP. Please try again.', 400);
    }

    // Mark as verified — booking submission must happen within remaining window
    entry.verified = true;
    res.json({ success: true, message: 'Email verified successfully.' });
  } catch (error) { next(error); }
};
