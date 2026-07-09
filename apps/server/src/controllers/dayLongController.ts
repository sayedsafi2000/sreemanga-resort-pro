import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import {
  dayLongProductSchema,
  dayLongBookingSchema,
  dayLongBookingUpdateSchema,
} from '../validators/dayLongValidator';

// ── Pricing ────────────────────────────────────────────────────────────────
// total = basePrice + pricePerPerson * (adults + children)
export function calculateDayLongTotal(
  product: { basePrice: number; pricePerPerson?: number | null },
  adults: number,
  children: number
): number {
  const pax = adults + children;
  const perPerson = product.pricePerPerson ?? 0;
  return product.basePrice + perPerson * pax;
}

const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const endOfDay = (d: Date) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };

// Existing pax booked for a product on a date whose slot overlaps [slotStart, slotEnd).
// Two slots overlap when aStart < bEnd && bStart < aEnd.
async function bookedPaxForSlot(
  productId: string,
  date: Date,
  slotStart: string,
  slotEnd: string,
  excludeBookingId?: string
): Promise<number> {
  const sameDay = await prisma.dayLongBooking.findMany({
    where: {
      productId,
      status: { not: 'CANCELLED' },
      bookingDate: { gte: startOfDay(date), lte: endOfDay(date) },
      ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
    },
    select: { adults: true, children: true, slotStart: true, slotEnd: true },
  });
  return sameDay
    .filter((b) => slotStart < b.slotEnd && b.slotStart < slotEnd)
    .reduce((sum, b) => sum + b.adults + b.children, 0);
}

// ── Products ───────────────────────────────────────────────────────────────
export const listProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category, active } = req.query;
    const where: any = {};
    if (category) where.category = category;
    if (active === 'true') where.isActive = true;
    const products = await prisma.dayLongProduct.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    res.json({ success: true, products });
  } catch (error) { next(error); }
};

export const getProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await prisma.dayLongProduct.findUnique({ where: { id: req.params.id } });
    if (!product) throw new AppError('Day Long product not found', 404);
    res.json({ success: true, product });
  } catch (error) { next(error); }
};

export const createProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = dayLongProductSchema.parse(req.body);
    const product = await prisma.dayLongProduct.create({
      data: {
        name: data.name,
        category: data.category,
        description: data.description ?? null,
        images: data.images ?? [],
        basePrice: data.basePrice,
        pricePerPerson: data.pricePerPerson ?? null,
        maxCapacity: data.maxCapacity ?? null,
        minCapacity: data.minCapacity ?? null,
        facilities: data.facilities ?? undefined,
        availableSlots: data.availableSlots ?? undefined,
        duration: data.duration ?? null,
        bookingRules: data.bookingRules ?? undefined,
        isActive: data.isActive ?? true,
        sortOrder: data.sortOrder ?? 0,
      },
    });
    res.status(201).json({ success: true, product });
  } catch (error) { next(error); }
};

export const updateProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = dayLongProductSchema.partial().parse(req.body);
    const existing = await prisma.dayLongProduct.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError('Day Long product not found', 404);
    const product = await prisma.dayLongProduct.update({
      where: { id: req.params.id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.category !== undefined ? { category: data.category } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.images !== undefined ? { images: data.images } : {}),
        ...(data.basePrice !== undefined ? { basePrice: data.basePrice } : {}),
        ...(data.pricePerPerson !== undefined ? { pricePerPerson: data.pricePerPerson } : {}),
        ...(data.maxCapacity !== undefined ? { maxCapacity: data.maxCapacity } : {}),
        ...(data.minCapacity !== undefined ? { minCapacity: data.minCapacity } : {}),
        ...(data.facilities !== undefined ? { facilities: data.facilities ?? undefined } : {}),
        ...(data.availableSlots !== undefined ? { availableSlots: data.availableSlots ?? undefined } : {}),
        ...(data.duration !== undefined ? { duration: data.duration } : {}),
        ...(data.bookingRules !== undefined ? { bookingRules: data.bookingRules ?? undefined } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
      },
    });
    res.json({ success: true, product });
  } catch (error) { next(error); }
};

export const deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.dayLongProduct.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError('Day Long product not found', 404);
    const bookingCount = await prisma.dayLongBooking.count({ where: { productId: req.params.id } });
    if (bookingCount > 0) {
      // Preserve history — deactivate instead of hard delete.
      await prisma.dayLongProduct.update({ where: { id: req.params.id }, data: { isActive: false } });
      res.json({ success: true, message: 'Product has bookings; deactivated instead of deleted.' });
      return;
    }
    await prisma.dayLongProduct.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Day Long product deleted' });
  } catch (error) { next(error); }
};

// ── Availability ───────────────────────────────────────────────────────────
export const checkAvailability = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId, date } = req.query;
    if (!productId || !date) throw new AppError('productId and date are required', 400);
    const product = await prisma.dayLongProduct.findUnique({ where: { id: String(productId) } });
    if (!product) throw new AppError('Day Long product not found', 404);
    const d = new Date(String(date));
    const bookings = await prisma.dayLongBooking.findMany({
      where: {
        productId: String(productId),
        status: { not: 'CANCELLED' },
        bookingDate: { gte: startOfDay(d), lte: endOfDay(d) },
      },
      select: { slotStart: true, slotEnd: true, adults: true, children: true, status: true },
    });
    const bookedPax = bookings.reduce((s, b) => s + b.adults + b.children, 0);
    const remainingCapacity = product.maxCapacity != null ? Math.max(0, product.maxCapacity - bookedPax) : null;
    res.json({ success: true, product: { id: product.id, name: product.name, maxCapacity: product.maxCapacity }, bookings, bookedPax, remainingCapacity });
  } catch (error) { next(error); }
};

// ── Bookings ───────────────────────────────────────────────────────────────
async function createBookingCore(input: unknown, createdById?: string) {
  const data = dayLongBookingSchema.parse(input);
  const product = await prisma.dayLongProduct.findUnique({ where: { id: data.productId } });
  if (!product) throw new AppError('Day Long product not found', 404);
  if (!product.isActive) throw new AppError('This product is not available for booking', 400);

  const pax = data.adults + data.children;
  if (product.minCapacity != null && pax < product.minCapacity) {
    throw new AppError(`Minimum ${product.minCapacity} persons required`, 400);
  }
  const date = new Date(data.bookingDate);
  if (product.maxCapacity != null) {
    const alreadyBooked = await bookedPaxForSlot(product.id, date, data.slotStart, data.slotEnd);
    if (alreadyBooked + pax > product.maxCapacity) {
      throw new AppError('Selected slot does not have enough capacity', 409);
    }
  }
  const totalAmount = calculateDayLongTotal(product, data.adults, data.children);

  return prisma.dayLongBooking.create({
    data: {
      productId: product.id,
      guestName: data.guestName,
      guestPhone: data.guestPhone,
      guestEmail: data.guestEmail ?? null,
      guestNid: data.guestNid ?? null,
      guestAddress: data.guestAddress ?? null,
      bookingDate: date,
      slotStart: data.slotStart,
      slotEnd: data.slotEnd,
      adults: data.adults,
      children: data.children,
      totalAmount,
      status: 'PENDING',
      notes: data.notes ?? null,
      preferredPaymentTiming: data.preferredPaymentTiming ?? null,
      preferredPaymentMethod: data.preferredPaymentMethod ?? null,
      paymentTransactionId: data.paymentTransactionId ?? null,
      paymentProofImage: data.paymentProofImage ?? null,
      createdById: createdById ?? null,
    },
    include: { product: true },
  });
}

export const listBookings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, productId, date, from, to } = req.query;
    const where: any = {};
    if (status) where.status = status;
    if (productId) where.productId = productId;
    if (date) {
      const d = new Date(String(date));
      where.bookingDate = { gte: startOfDay(d), lte: endOfDay(d) };
    } else if (from || to) {
      where.bookingDate = {};
      if (from) where.bookingDate.gte = startOfDay(new Date(String(from)));
      if (to) where.bookingDate.lte = endOfDay(new Date(String(to)));
    }
    const bookings = await prisma.dayLongBooking.findMany({
      where,
      include: { product: true },
      orderBy: [{ bookingDate: 'desc' }, { createdAt: 'desc' }],
    });
    res.json({ success: true, bookings });
  } catch (error) { next(error); }
};

export const getBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const booking = await prisma.dayLongBooking.findUnique({
      where: { id: req.params.id },
      include: { product: true },
    });
    if (!booking) throw new AppError('Day Long booking not found', 404);
    res.json({ success: true, booking });
  } catch (error) { next(error); }
};

export const createBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const booking = await createBookingCore(req.body, req.user?.id);
    res.status(201).json({ success: true, booking });
  } catch (error) { next(error); }
};

export const updateBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = dayLongBookingUpdateSchema.parse(req.body);
    const existing = await prisma.dayLongBooking.findUnique({
      where: { id: req.params.id },
      include: { product: true },
    });
    if (!existing) throw new AppError('Day Long booking not found', 404);

    // Recompute total if pax changed.
    const adults = data.adults ?? existing.adults;
    const children = data.children ?? existing.children;
    const paxChanged = data.adults !== undefined || data.children !== undefined;
    const totalAmount = paxChanged
      ? calculateDayLongTotal(existing.product, adults, children)
      : existing.totalAmount;

    const booking = await prisma.dayLongBooking.update({
      where: { id: req.params.id },
      data: {
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
        ...(data.adults !== undefined ? { adults: data.adults } : {}),
        ...(data.children !== undefined ? { children: data.children } : {}),
        ...(data.slotStart !== undefined ? { slotStart: data.slotStart } : {}),
        ...(data.slotEnd !== undefined ? { slotEnd: data.slotEnd } : {}),
        ...(data.bookingDate !== undefined ? { bookingDate: new Date(data.bookingDate) } : {}),
        ...(paxChanged ? { totalAmount } : {}),
      },
      include: { product: true },
    });
    res.json({ success: true, booking });
  } catch (error) { next(error); }
};

export const deleteBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.dayLongBooking.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError('Day Long booking not found', 404);
    // Cancel rather than hard-delete to preserve revenue history.
    const booking = await prisma.dayLongBooking.update({
      where: { id: req.params.id },
      data: { status: 'CANCELLED' },
      include: { product: true },
    });
    res.json({ success: true, booking, message: 'Booking cancelled' });
  } catch (error) { next(error); }
};

// ── Public (web) handlers ──────────────────────────────────────────────────
export const publicListProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category } = req.query;
    const where: any = { isActive: true };
    if (category) where.category = category;
    const products = await prisma.dayLongProduct.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    res.json({ success: true, products });
  } catch (error) { next(error); }
};

export const publicGetProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await prisma.dayLongProduct.findFirst({
      where: { id: req.params.id, isActive: true },
    });
    if (!product) throw new AppError('Day Long product not found', 404);
    res.json({ success: true, product });
  } catch (error) { next(error); }
};

export const publicCreateBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // OTP guard (mirrors room booking flow) — requires a verified, unexpired OTP.
    const email = typeof req.body?.guestEmail === 'string' ? req.body.guestEmail.toLowerCase().trim() : null;
    if (email) {
      const entry = await prisma.otpCode.findFirst({
        where: { email, verified: true, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: 'desc' },
      });
      if (!entry) throw new AppError('Email OTP not verified. Please verify your email before booking.', 403);
      await prisma.otpCode.deleteMany({ where: { email } });
    }
    const booking = await createBookingCore(req.body);
    res.status(201).json({ success: true, booking });
  } catch (error) { next(error); }
};

