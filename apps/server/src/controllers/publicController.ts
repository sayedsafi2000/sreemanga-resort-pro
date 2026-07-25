import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { z } from 'zod';
import { createPaymentFromBooking } from '../utils/bookingPayment';
import { createCheckoutSessionForBooking } from './stripeController';
import { emailService } from '../utils/emailService';
import crypto from 'crypto';
import { recordVoucherRedemption, validateVoucherForCheckout } from '../utils/voucher';

// ── OTP store (DB-backed, Phase 0.6) ───────────────────────────────────────
// Persisted in the OtpCode table so it survives restarts and works across
// multiple server instances. One active row per email (latest wins).

// Periodically purge expired OTP rows.
setInterval(() => {
  prisma.otpCode
    .deleteMany({ where: { expiresAt: { lt: new Date() } } })
    .catch((err) => console.error('[OTP] cleanup failed:', err));
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
  guestPhone: z
    .string()
    .trim()
    .refine((v) => v.replace(/\D/g, '').length >= 10, {
      message: 'Phone must be at least 10 digits',
    }),
  guestEmail: z.string().email().optional(),
  adults: z.number().int().min(1).max(20).default(1),
  children: z.number().int().min(0).max(20).default(0),
  preferredPaymentTiming: z.enum(['INSTANT', 'LATER']).default('LATER'),
  preferredPaymentMethod: z.enum(['BKASH', 'BANK_TRANSFER', 'STRIPE']).optional(),
  paymentTransactionId: z.string().min(4).max(100).optional(),
  paymentProofImage: z.string().optional(),
  guestNid: z.string().optional(),
  guestAddress: z.string().optional(),
  checkInDate: z.string(),
  checkOutDate: z.string(),
  notes: z.string().optional(),
  voucherCode: z.string().min(1).optional(),
}).superRefine((data, ctx) => {
  if (data.preferredPaymentTiming === 'INSTANT' && !data.preferredPaymentMethod) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Payment method is required for instant payment',
      path: ['preferredPaymentMethod'],
    });
  }
  // Manual methods (bKash / bank) need a transaction ID; Stripe is charged online.
  if (
    data.preferredPaymentTiming === 'INSTANT' &&
    data.preferredPaymentMethod !== 'STRIPE' &&
    !data.paymentTransactionId
  ) {
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
      const normalised = data.guestEmail.toLowerCase().trim();
      const entry = await prisma.otpCode.findFirst({
        where: { email: normalised, verified: true, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: 'desc' },
      });
      if (!entry) {
        throw new AppError('Email OTP not verified. Please verify your email before booking.', 403);
      }
      // Invalidate all OTPs for this email after use so they can't be replayed
      await prisma.otpCode.deleteMany({ where: { email: normalised } });
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
    const grossAmount = room.price * days;

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

      let discountAmount = 0;
      let voucherId: string | undefined;
      if (data.voucherCode?.trim()) {
        const applied = await validateVoucherForCheckout(tx, {
          code: data.voucherCode,
          channel: 'ROOM',
          grossAmount,
          lineItems: [{ itemType: 'ROOM', itemId: room.id, amount: grossAmount }],
          assignee: {
            guestId: guest.id,
            guestEmail: data.guestEmail || null,
          },
        });
        discountAmount = applied.discountAmount;
        voucherId = applied.voucher.id;
      }

      const totalAmount = Math.max(0, Math.round((grossAmount - discountAmount) * 100) / 100);

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
        discountAmount,
        voucherId,
        status: 'PENDING',
        notes: data.notes,
      } as any;

      const booking = await tx.booking.create({
        data: bookingData,
        include: { room: true, guest: true },
      });

      if (voucherId && discountAmount > 0) {
        await recordVoucherRedemption(tx, {
          voucherId,
          amountDiscounted: discountAmount,
          referenceType: 'BOOKING',
          referenceId: booking.id,
          guestId: guest.id,
          guestEmail: guest.email ?? null,
          source: 'PUBLIC_WEB',
          channel: 'ROOM',
        });
      }

      await createPaymentFromBooking(tx, booking);

      return booking;
    });

    // Card payment → create a Stripe Checkout Session and hand the URL back so
    // the client can redirect. The confirmation email fires from the webhook
    // once payment succeeds, so we skip the "pending" email here.
    if (data.preferredPaymentMethod === 'STRIPE') {
      const payment = await prisma.payment.findFirst({
        where: { bookingId: result.id },
        select: { id: true },
      });
      if (!payment) throw new AppError('Payment record missing for booking', 500);
      const checkoutUrl = await createCheckoutSessionForBooking(result, payment.id);
      res.status(201).json({ success: true, booking: result, checkoutUrl });
      return;
    }

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

    // Rate-limit: don't allow resend within 60 seconds of the last active OTP.
    // (OTP lives 5 min; a fresh one has expiresAt > now + 4 min.)
    const existing = await prisma.otpCode.findFirst({
      where: { email: normalised },
      orderBy: { createdAt: 'desc' },
    });
    if (existing && existing.expiresAt.getTime() - 4 * 60 * 1000 > Date.now()) {
      throw new AppError('Please wait before requesting a new OTP', 429);
    }

    // Generate 6-digit OTP. Replace any prior OTPs for this email.
    const otp = String(Math.floor(100000 + crypto.randomInt(900000)));
    await prisma.otpCode.deleteMany({ where: { email: normalised } });
    await prisma.otpCode.create({
      data: {
        email: normalised,
        code: otp,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
        verified: false,
      },
    });

    const isDev = process.env.NODE_ENV !== 'production';
    // Dev convenience: surface the OTP in the server console so local testing
    // works even when SMTP isn't configured.
    if (isDev) console.log(`[OTP] ${normalised} → ${otp} (dev; expires in 5 min)`);

    const sent = await emailService.sendOtpEmail(normalised, otp);

    if (!sent) {
      if (!isDev) {
        // Prod: drop the entry so the user can retry immediately and no
        // undelivered OTP lingers.
        await prisma.otpCode.deleteMany({ where: { email: normalised } });
        throw new AppError('Failed to send OTP email. Please try again.', 500);
      }
      // Dev: keep the OTP valid and hand it back so local testing works
      // without SMTP. `devOtp` is only ever set when NODE_ENV !== production.
      res.json({
        success: true,
        message: 'OTP generated (dev mode — email not configured).',
        devOtp: otp,
      });
      return;
    }

    res.json({
      success: true,
      message: 'OTP sent to your email.',
      ...(isDev ? { devOtp: otp } : {}),
    });
  } catch (error) { next(error); }
};

// ── Verify OTP ────────────────────────────────────────────────────────────
export const verifyOtp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) throw new AppError('Email and OTP are required', 400);

    const normalised = email.toLowerCase().trim();
    const entry = await prisma.otpCode.findFirst({
      where: { email: normalised },
      orderBy: { createdAt: 'desc' },
    });

    if (!entry) throw new AppError('OTP not found. Please request a new one.', 400);
    if (entry.expiresAt < new Date()) {
      await prisma.otpCode.deleteMany({ where: { email: normalised } });
      throw new AppError('OTP has expired. Please request a new one.', 400);
    }
    if (entry.code !== String(otp).trim()) {
      throw new AppError('Incorrect OTP. Please try again.', 400);
    }

    // Mark as verified — booking submission must happen within remaining window
    await prisma.otpCode.update({ where: { id: entry.id }, data: { verified: true } });
    res.json({ success: true, message: 'Email verified successfully.' });
  } catch (error) { next(error); }
};
