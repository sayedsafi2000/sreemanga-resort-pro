import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../utils/prisma';
import { bookingSchema, updateBookingSchema } from '../validators/bookingValidator';
import { AppError } from '../middleware/errorHandler';
import { emailService } from '../utils/emailService';
import { createPaymentFromBooking } from '../utils/bookingPayment';
import { recordVoucherRedemption, validateVoucherForCheckout } from '../utils/voucher';
import { assertRoomAvailable, lockRoomForBooking, overlappingStayWhere } from '../utils/bookingAvailability';
import { recordRevenue } from '../utils/accountLedger';
import {
  bookingCellState,
  computeBookingTotal,
  formatInvoiceNo,
  mergeCellState,
  nightsBetween,
  paidAndDue,
  parseInvoiceNo,
  round2,
  stayNights,
  type CellState,
} from '../utils/bookingPricing';

const BOOKING_INCLUDE = {
  room: true,
  guest: true,
  staff: { select: { id: true, name: true, email: true, role: true } },
  payments: { orderBy: { createdAt: 'asc' as const } },
  voucher: { select: { id: true, name: true, codeHint: true } },
} as const;

type BookingRow = Prisma.BookingGetPayload<{ include: typeof BOOKING_INCLUDE }>;

// ── Stakeholder detection (guest is also a shareholder) ────────────────────
type StakeholderKeys = { emails: Set<string>; phones: Set<string> };

/** Normalise BD phone numbers so 8801712345678, +880 1712-345678 and 01712345678 all compare equal. */
export function normalisePhone(raw?: string | null): string {
  let d = (raw ?? '').replace(/\D/g, '');
  if (d.startsWith('880')) d = '0' + d.slice(3);
  return d.slice(-11);
}

async function stakeholderKeys(): Promise<StakeholderKeys> {
  const rows = await prisma.shareholder.findMany({ where: { isActive: true }, select: { email: true, phone: true } });
  return {
    emails: new Set(rows.map((r) => r.email?.toLowerCase()).filter((e): e is string => Boolean(e))),
    phones: new Set(rows.map((r) => normalisePhone(r.phone)).filter((p) => p.length >= 10)),
  };
}

function isStakeholderGuest(g: { email?: string | null; phone?: string | null } | null | undefined, keys: StakeholderKeys) {
  if (!g) return false;
  if (g.email && keys.emails.has(g.email.toLowerCase())) return true;
  const p = normalisePhone(g.phone);
  return p.length >= 10 && keys.phones.has(p);
}

function decorate(b: BookingRow, keys: StakeholderKeys) {
  const { paid, due } = paidAndDue(b.totalAmount, b.payments);
  const nights = nightsBetween(b.checkInDate, b.checkOutDate);
  const pricing = computeBookingTotal({
    rate: b.rate ?? b.room.price,
    nights,
    extraPersons: b.extraPersons,
    extraGuestCharge: b.room.extraGuestCharge,
    extraCharge: b.extraCharge,
    voucherDiscount: b.discountAmount,
    staffDiscount: b.staffDiscount,
  });
  return {
    ...b,
    invoiceLabel: formatInvoiceNo(b.invoiceNo),
    nights,
    paid,
    due,
    pricing,
    isStakeholder: isStakeholderGuest(b.guest, keys),
    source: b.staffId ? 'ADMIN' : 'WEB',
  };
}

/** Match public booking: YYYY-MM-DD parses the same as `new Date(isoDate)`. */
function parseStayDate(raw: string): Date {
  return new Date(raw.trim());
}

function parseStay(checkInRaw: string, checkOutRaw: string) {
  const checkIn = parseStayDate(checkInRaw);
  const checkOut = parseStayDate(checkOutRaw);
  if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime())) {
    throw new AppError('Invalid check-in or check-out date', 400);
  }
  if (checkOut <= checkIn) throw new AppError('Check-out date must be after check-in date', 400);
  return { checkIn, checkOut };
}

// ── List ──────────────────────────────────────────────────────────────────
export const getAllBookings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = req.query as Record<string, string | undefined>;
    const truthy = (v?: string) => v === '1' || v === 'true';

    // Everything except the status filter — stats are computed over this set.
    const where: Prisma.BookingWhereInput = {};
    if (q.roomId) where.roomId = q.roomId;
    if (q.guestId) where.guestId = q.guestId;
    if (q.from || q.to) {
      where.checkInDate = {};
      if (q.from) where.checkInDate.gte = new Date(q.from);
      if (q.to) {
        const end = new Date(q.to);
        end.setHours(23, 59, 59, 999);
        where.checkInDate.lte = end;
      }
    }
    if (truthy(q.vip)) where.isVip = true;
    if (truthy(q.foreigner)) where.isForeigner = true;
    if (q.source === 'WEB') where.staffId = null;
    else if (q.source === 'ADMIN') where.staffId = { not: null };
    // Field-specific filters (the list page's Search & Filter panel); AND-ed together.
    if (q.name?.trim()) where.guest = { ...(where.guest as object), name: { contains: q.name.trim(), mode: 'insensitive' } };
    if (q.phone?.trim()) {
      const digits = q.phone.replace(/\D/g, '');
      if (digits) where.guest = { ...(where.guest as object), phone: { contains: digits.replace(/^880/, '').replace(/^0/, '') } };
    }
    if (q.invoice?.trim()) {
      const inv = parseInvoiceNo(q.invoice.trim());
      where.invoiceNo = inv ?? -1; // unparsable → matches nothing
    }
    if (q.search?.trim()) {
      const s = q.search.trim();
      const digits = s.replace(/\D/g, '');
      const inv = parseInvoiceNo(s);
      where.OR = [
        { guest: { name: { contains: s, mode: 'insensitive' } } },
        { guest: { email: { contains: s, mode: 'insensitive' } } },
        { room: { name: { contains: s, mode: 'insensitive' } } },
        ...(digits.length >= 4 ? [{ guest: { phone: { contains: digits } } }] : []),
        ...(inv ? [{ invoiceNo: inv }] : []),
      ];
    }

    const [rows, keys] = await Promise.all([
      prisma.booking.findMany({ where, include: BOOKING_INCLUDE, orderBy: { createdAt: 'desc' } }),
      stakeholderKeys(),
    ]);
    const all = rows.map((b) => decorate(b, keys));

    const stats = {
      all: all.length,
      PENDING: 0, CONFIRMED: 0, CHECKED_IN: 0, CHECKED_OUT: 0, CANCELLED: 0,
      vip: 0, foreigner: 0, stakeholder: 0, web: 0, due: 0,
    } as Record<string, number>;
    for (const b of all) {
      stats[b.status] = (stats[b.status] ?? 0) + 1;
      if (b.isVip) stats.vip++;
      if (b.isForeigner) stats.foreigner++;
      if (b.isStakeholder) stats.stakeholder++;
      if (b.source === 'WEB') stats.web++;
      if (b.due > 0 && b.status !== 'CANCELLED') stats.due++;
    }

    const statuses = q.status ? q.status.split(',').map((s) => s.trim()).filter(Boolean) : [];
    let filtered = statuses.length ? all.filter((b) => statuses.includes(b.status)) : all;
    if (truthy(q.stakeholder)) filtered = filtered.filter((b) => b.isStakeholder);
    if (truthy(q.due)) filtered = filtered.filter((b) => b.due > 0 && b.status !== 'CANCELLED');

    const total = filtered.length;
    const offset = Math.max(0, Number(q.offset) || 0);
    const limit = Math.min(500, Math.max(0, Number(q.limit) || 0));
    const bookings = limit ? filtered.slice(offset, offset + limit) : filtered.slice(offset);

    res.json({ success: true, bookings, total, stats });
  } catch (error) { next(error); }
};

export const getBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [booking, keys] = await Promise.all([
      prisma.booking.findUnique({ where: { id: req.params.id }, include: BOOKING_INCLUDE }),
      stakeholderKeys(),
    ]);
    if (!booking) throw new AppError('Booking not found', 404);
    res.json({ success: true, booking: decorate(booking, keys) });
  } catch (error) { next(error); }
};

// ── Availability for a stay (New Booking room grid) ───────────────────────
export const getRoomAvailability = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { checkIn: ci, checkOut: co, excludeBookingId } = req.query as Record<string, string | undefined>;
    if (!ci || !co) throw new AppError('checkIn and checkOut are required', 400);
    const { checkIn, checkOut } = parseStay(ci, co);
    const [rooms, bookings] = await Promise.all([
      prisma.room.findMany({ orderBy: [{ type: 'asc' }, { name: 'asc' }] }),
      prisma.booking.findMany({
        where: {
          ...overlappingStayWhere(checkIn, checkOut),
          ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
        },
        include: { guest: { select: { name: true, phone: true } } },
      }),
    ]);
    const nights = nightsBetween(checkIn, checkOut);
    const result = rooms.map((r) => {
      const conflicts = bookings.filter((b) => b.roomId === r.id);
      let state: CellState = r.status === 'MAINTENANCE' ? 'BLOCKED' : 'AVAILABLE';
      for (const b of conflicts) {
        const s = bookingCellState(b.status);
        if (s) state = mergeCellState(state, s);
      }
      return {
        ...r,
        state,
        nights,
        conflicts: conflicts.map((b) => ({
          id: b.id,
          invoiceLabel: formatInvoiceNo(b.invoiceNo),
          status: b.status,
          guestName: b.guest.name,
          checkInDate: b.checkInDate,
          checkOutDate: b.checkOutDate,
        })),
      };
    });
    res.json({ success: true, checkIn, checkOut, nights, rooms: result });
  } catch (error) { next(error); }
};

// ── Monthly calendar (rooms × days) ───────────────────────────────────────
export const getMonthlyCalendar = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const monthRaw = String(req.query.month ?? '') || now.toISOString().slice(0, 7);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(monthRaw)) throw new AppError('month must be YYYY-MM', 400);
    const [y, m] = monthRaw.split('-').map(Number);
    const start = new Date(Date.UTC(y, m - 1, 1));
    const end = new Date(Date.UTC(y, m, 1));
    const todayKey = now.toISOString().slice(0, 10);

    const days: { date: string; day: number; weekday: number; isPast: boolean; isToday: boolean; isWeekend: boolean }[] = [];
    for (let d = new Date(start); d < end; d.setUTCDate(d.getUTCDate() + 1)) {
      const date = d.toISOString().slice(0, 10);
      const weekday = d.getUTCDay();
      days.push({ date, day: d.getUTCDate(), weekday, isPast: date < todayKey, isToday: date === todayKey, isWeekend: weekday === 5 || weekday === 6 });
    }

    const [rooms, bookings, keys] = await Promise.all([
      prisma.room.findMany({ orderBy: [{ type: 'asc' }, { name: 'asc' }] }),
      prisma.booking.findMany({
        where: {
          status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'] },
          checkInDate: { lt: end },
          checkOutDate: { gt: start },
        },
        include: { guest: { select: { name: true, phone: true, email: true } }, staff: { select: { name: true } } },
      }),
      stakeholderKeys(),
    ]);

    type Cell = { state: CellState; booking?: Record<string, unknown> };
    const cells: Record<string, Record<string, Cell>> = {};
    for (const r of rooms) {
      cells[r.id] = {};
      if (r.status === 'MAINTENANCE') for (const d of days) cells[r.id][d.date] = { state: 'BLOCKED' };
    }
    const stats = { booked: 0, reserved: 0, blocked: 0, available: 0, vip: 0, foreigner: 0, stakeholder: 0, web: 0, bookings: 0 };
    const monthDates = new Set(days.map((d) => d.date));
    for (const b of bookings) {
      const state = bookingCellState(b.status);
      if (!state || !cells[b.roomId]) continue;
      const summary = {
        id: b.id,
        invoiceLabel: formatInvoiceNo(b.invoiceNo),
        status: b.status,
        guestName: b.guest.name,
        guestPhone: b.guest.phone,
        isVip: b.isVip,
        isForeigner: b.isForeigner,
        isStakeholder: isStakeholderGuest(b.guest, keys),
        source: b.staffId ? 'ADMIN' : 'WEB',
        staffName: b.staff?.name ?? null,
        checkInDate: b.checkInDate,
        checkOutDate: b.checkOutDate,
        nights: nightsBetween(b.checkInDate, b.checkOutDate),
        totalAmount: b.totalAmount,
      };
      let touchesMonth = false;
      for (const date of stayNights(b.checkInDate, b.checkOutDate)) {
        if (!monthDates.has(date)) continue;
        touchesMonth = true;
        const prev = cells[b.roomId][date];
        if (!prev || mergeCellState(prev.state, state) === state) cells[b.roomId][date] = { state, booking: summary };
      }
      if (touchesMonth) {
        stats.bookings++;
        if (b.isVip) stats.vip++;
        if (b.isForeigner) stats.foreigner++;
        if (summary.isStakeholder) stats.stakeholder++;
        if (!b.staffId) stats.web++;
      }
    }
    for (const r of rooms) {
      for (const d of days) {
        const c = cells[r.id][d.date];
        if (!c) stats.available++;
        else if (c.state === 'BOOKED') stats.booked++;
        else if (c.state === 'RESERVED') stats.reserved++;
        else if (c.state === 'BLOCKED') stats.blocked++;
      }
    }

    res.json({
      success: true,
      month: monthRaw,
      days,
      rooms: rooms.map((r) => ({
        id: r.id, name: r.name, type: r.type, capacity: r.capacity, price: r.price,
        weekendPrice: r.weekendPrice, extraGuestCharge: r.extraGuestCharge, status: r.status, mainImage: r.mainImage,
      })),
      cells,
      stats,
    });
  } catch (error) { next(error); }
};

// ── Create ────────────────────────────────────────────────────────────────
export const createBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = bookingSchema.parse(req.body);
    const { checkIn, checkOut } = parseStay(data.checkInDate, data.checkOutDate);
    const userId = (req as any).user?.id as string | undefined;

    const room = await prisma.room.findUnique({ where: { id: data.roomId } });
    if (!room) throw new AppError('Room not found', 404);
    if (room.status === 'MAINTENANCE') throw new AppError('Room is blocked for maintenance', 400);

    const nights = nightsBetween(checkIn, checkOut);
    const rate = data.rate ?? room.price;
    const status = data.status ?? 'PENDING';
    const instant = data.preferredPaymentTiming === 'INSTANT';

    const booking = await prisma.$transaction(async (tx) => {
      // Serialise per room, then check availability inside the transaction so
      // two simultaneous requests can't both pass the check and double-book.
      await lockRoomForBooking(tx, room.id);
      await assertRoomAvailable(tx, room.id, checkIn, checkOut);

      // Guest: existing (optionally updated with the details typed) or new.
      const guestPatch: Prisma.GuestUpdateInput = {
        ...(data.guestName?.trim() ? { name: data.guestName.trim() } : {}),
        ...(data.guestPhone?.trim() ? { phone: data.guestPhone.trim() } : {}),
        ...(data.guestEmail !== undefined ? { email: data.guestEmail?.trim() || null } : {}),
        ...(data.guestNid !== undefined ? { nid: data.guestNid || null } : {}),
        ...(data.guestAddress !== undefined ? { address: data.guestAddress || null } : {}),
        ...(data.guestGender !== undefined ? { gender: data.guestGender || null } : {}),
        ...(data.guestDob !== undefined ? { dateOfBirth: data.guestDob ? new Date(data.guestDob) : null } : {}),
      };
      let guestId = data.guestId?.trim() || undefined;
      if (!guestId) {
        const created = await tx.guest.create({
          data: {
            name: data.guestName!.trim(),
            phone: data.guestPhone!.trim(),
            email: data.guestEmail?.trim() || undefined,
            nid: data.guestNid || undefined,
            address: data.guestAddress || undefined,
            gender: data.guestGender || undefined,
            dateOfBirth: data.guestDob ? new Date(data.guestDob) : undefined,
          },
        });
        guestId = created.id;
      } else if (Object.keys(guestPatch).length > 0) {
        await tx.guest.update({ where: { id: guestId }, data: guestPatch });
      }
      const guest = await tx.guest.findUnique({ where: { id: guestId } });
      if (!guest) throw new AppError('Guest not found', 404);

      // Pricing: gross first (voucher is validated against it), then the final total.
      const base = {
        rate,
        nights,
        extraPersons: data.extraPersons,
        extraGuestCharge: room.extraGuestCharge,
        extraCharge: data.extraCharge,
        staffDiscount: data.staffDiscount,
      };
      const pre = computeBookingTotal(base);
      let voucherDiscount = 0;
      let voucherId: string | undefined;
      if (data.voucherCode?.trim()) {
        const applied = await validateVoucherForCheckout(tx, {
          code: data.voucherCode,
          channel: 'ROOM',
          grossAmount: pre.gross,
          lineItems: [{ itemType: 'ROOM', itemId: room.id, amount: pre.gross }],
          assignee: { guestId, guestEmail: guest.email || null, userId },
        });
        voucherDiscount = applied.discountAmount;
        voucherId = applied.voucher.id;
      }
      const pricing = computeBookingTotal({ ...base, voucherDiscount });
      if (data.advance && data.advance.amount > pricing.total + 0.001) {
        throw new AppError(`Advance (৳${data.advance.amount}) exceeds the invoice total (৳${pricing.total})`, 400);
      }

      const created = await tx.booking.create({
        data: {
          roomId: room.id,
          guestId,
          adults: data.adults,
          children: data.children,
          extraPersons: pricing.extraPersons,
          rate,
          extraCharge: pricing.extraCharge,
          extraChargeNote: data.extraChargeNote?.trim() || null,
          staffDiscount: pricing.staffDiscount,
          isVip: data.isVip,
          isForeigner: data.isForeigner,
          checkInDate: checkIn,
          checkOutDate: checkOut,
          totalAmount: pricing.total,
          discountAmount: voucherDiscount,
          voucherId,
          status,
          staffId: userId,
          notes: data.notes?.trim() || undefined,
          preferredPaymentTiming: data.advance ? 'INSTANT' : data.preferredPaymentTiming ?? undefined,
          preferredPaymentMethod: data.advance ? data.advance.method : instant ? data.preferredPaymentMethod ?? undefined : undefined,
          paymentTransactionId: data.advance ? data.advance.transactionId ?? undefined : instant ? data.paymentTransactionId?.trim() : undefined,
          paymentProofImage: instant ? data.paymentProofImage ?? undefined : undefined,
        },
      });

      if (voucherId && voucherDiscount > 0) {
        await recordVoucherRedemption(tx, {
          voucherId,
          amountDiscounted: voucherDiscount,
          referenceType: 'BOOKING',
          referenceId: created.id,
          redeemedById: userId,
          guestId,
          guestEmail: guest.email ?? null,
          source: 'ADMIN',
          channel: 'ROOM',
        });
      }

      if (data.advance) {
        // Front-desk advance: recorded as a completed payment + cash/income ledger entries.
        await tx.payment.create({
          data: {
            bookingId: created.id,
            amount: round2(data.advance.amount),
            method: data.advance.method,
            status: 'COMPLETED',
            transactionId: data.advance.transactionId?.trim() || undefined,
            notes: data.advance.notes?.trim() || 'Advance at booking',
            referenceType: 'BOOKING',
            referenceId: created.id,
            businessLine: 'ROOM',
          },
        });
        await recordRevenue(tx, {
          amount: round2(data.advance.amount),
          method: data.advance.method,
          businessLine: 'ROOM',
          referenceType: 'BOOKING',
          referenceId: created.id,
          createdById: userId,
        });
      } else if (data.preferredPaymentTiming) {
        await createPaymentFromBooking(tx, created);
      }

      return tx.booking.findUnique({ where: { id: created.id }, include: BOOKING_INCLUDE });
    });
    if (!booking) throw new AppError('Booking not found after create', 500);

    if (status === 'CHECKED_IN') {
      await prisma.room.update({ where: { id: room.id }, data: { status: 'BOOKED' } });
    }

    if (data.sendEmail && booking.guest.email) {
      const payload = {
        bookingId: booking.id,
        guestName: booking.guest.name,
        roomName: booking.room.name,
        checkInDate: booking.checkInDate.toLocaleDateString('en-GB'),
        checkOutDate: booking.checkOutDate.toLocaleDateString('en-GB'),
        totalAmount: booking.totalAmount,
      };
      const send =
        status === 'PENDING'
          ? emailService.sendBookingPendingEmail(booking.guest.email, payload)
          : emailService.sendBookingConfirmationEmail(booking.guest.email, { ...payload, adults: booking.adults, children: booking.children });
      send.catch((err) => console.error('Failed to send booking email:', err));
    }

    res.status(201).json({ success: true, booking: decorate(booking, await stakeholderKeys()) });
  } catch (error) { next(error); }
};

// ── Update ────────────────────────────────────────────────────────────────
export const updateBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data = updateBookingSchema.parse(req.body);

    const existing = await prisma.booking.findUnique({ where: { id }, include: { room: true } });
    if (!existing) throw new AppError('Booking not found', 404);

    const booking = await prisma.$transaction(async (tx) => {
      const roomId = data.roomId ?? existing.roomId;
      const checkIn = data.checkInDate ? parseStayDate(data.checkInDate) : existing.checkInDate;
      const checkOut = data.checkOutDate ? parseStayDate(data.checkOutDate) : existing.checkOutDate;
      if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime())) throw new AppError('Invalid check-in or check-out date', 400);
      if (checkOut <= checkIn) throw new AppError('Check-out date must be after check-in date', 400);

      const room = roomId === existing.roomId ? existing.room : await tx.room.findUnique({ where: { id: roomId } });
      if (!room) throw new AppError('Room not found', 404);

      const nextStatus = data.status ?? existing.status;
      const stayChanged =
        roomId !== existing.roomId ||
        checkIn.getTime() !== existing.checkInDate.getTime() ||
        checkOut.getTime() !== existing.checkOutDate.getTime();
      if (stayChanged && nextStatus !== 'CANCELLED') {
        await lockRoomForBooking(tx, roomId);
        await assertRoomAvailable(tx, roomId, checkIn, checkOut, existing.id);
      }

      const pricingTouched =
        stayChanged ||
        data.rate !== undefined ||
        data.extraPersons !== undefined ||
        data.extraCharge !== undefined ||
        data.staffDiscount !== undefined;
      let pricingPatch: Prisma.BookingUpdateInput = {};
      if (pricingTouched) {
        // Explicit rate wins; else keep the snapshot; else (new room, no snapshot) the room price.
        const rate = data.rate !== undefined && data.rate !== null ? data.rate : existing.rate ?? room.price;
        const p = computeBookingTotal({
          rate,
          nights: nightsBetween(checkIn, checkOut),
          extraPersons: data.extraPersons ?? existing.extraPersons,
          extraGuestCharge: room.extraGuestCharge,
          extraCharge: data.extraCharge ?? existing.extraCharge,
          voucherDiscount: existing.discountAmount,
          staffDiscount: data.staffDiscount ?? existing.staffDiscount,
        });
        pricingPatch = {
          rate,
          extraPersons: p.extraPersons,
          extraCharge: p.extraCharge,
          staffDiscount: p.staffDiscount,
          totalAmount: p.total,
        };
      }

      if (data.guest) {
        const g = data.guest;
        await tx.guest.update({
          where: { id: existing.guestId },
          data: {
            ...(g.name !== undefined ? { name: g.name.trim() } : {}),
            ...(g.phone !== undefined && g.phone.trim() ? { phone: g.phone.trim() } : {}),
            ...(g.email !== undefined ? { email: g.email?.trim() || null } : {}),
            ...(g.nid !== undefined ? { nid: g.nid || null } : {}),
            ...(g.address !== undefined ? { address: g.address || null } : {}),
            ...(g.gender !== undefined ? { gender: g.gender || null } : {}),
            ...(g.dateOfBirth !== undefined ? { dateOfBirth: g.dateOfBirth ? new Date(g.dateOfBirth) : null } : {}),
          },
        });
      }

      return tx.booking.update({
        where: { id },
        data: {
          room: { connect: { id: roomId } },
          checkInDate: checkIn,
          checkOutDate: checkOut,
          ...(data.adults !== undefined ? { adults: data.adults } : {}),
          ...(data.children !== undefined ? { children: data.children } : {}),
          ...(data.extraChargeNote !== undefined ? { extraChargeNote: data.extraChargeNote?.trim() || null } : {}),
          ...(data.isVip !== undefined ? { isVip: data.isVip } : {}),
          ...(data.isForeigner !== undefined ? { isForeigner: data.isForeigner } : {}),
          ...(data.preferredPaymentTiming !== undefined ? { preferredPaymentTiming: data.preferredPaymentTiming } : {}),
          ...(data.preferredPaymentMethod !== undefined ? { preferredPaymentMethod: data.preferredPaymentMethod } : {}),
          ...(data.paymentTransactionId !== undefined ? { paymentTransactionId: data.paymentTransactionId } : {}),
          ...(data.paymentProofImage !== undefined ? { paymentProofImage: data.paymentProofImage } : {}),
          ...(data.staffId !== undefined ? { staff: data.staffId ? { connect: { id: data.staffId } } : { disconnect: true } } : {}),
          ...(data.status !== undefined ? { status: data.status } : {}),
          ...(data.notes !== undefined ? { notes: data.notes?.trim() || null } : {}),
          ...pricingPatch,
        },
        include: BOOKING_INCLUDE,
      });
    });

    // Room status follows real occupancy only (a confirmed future stay must not
    // mark the room occupied today).
    if (data.status === 'CHECKED_IN') {
      await prisma.room.update({ where: { id: booking.roomId }, data: { status: 'BOOKED' } });
    } else if (data.status === 'CHECKED_OUT') {
      await prisma.room.update({ where: { id: booking.roomId }, data: { status: 'CLEANING' } });
    } else if (data.status === 'CANCELLED') {
      const stillOccupied = await prisma.booking.count({ where: { roomId: booking.roomId, status: 'CHECKED_IN' } });
      if (stillOccupied === 0 && booking.room.status === 'BOOKED') {
        await prisma.room.update({ where: { id: booking.roomId }, data: { status: 'AVAILABLE' } });
      }
    }

    if (data.status === 'CONFIRMED' && existing.status !== 'CONFIRMED' && booking.guest.email) {
      emailService
        .sendBookingConfirmationEmail(booking.guest.email, {
          bookingId: booking.id,
          guestName: booking.guest.name,
          roomName: booking.room.name,
          checkInDate: booking.checkInDate.toLocaleDateString('en-GB'),
          checkOutDate: booking.checkOutDate.toLocaleDateString('en-GB'),
          totalAmount: booking.totalAmount,
          adults: booking.adults,
          children: booking.children,
        })
        .catch((err) => console.error('Failed to send booking confirmation email:', err));
    }

    res.json({ success: true, booking: decorate(booking, await stakeholderKeys()) });
  } catch (error) { next(error); }
};

// ── Delete ────────────────────────────────────────────────────────────────
export const deleteBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking) throw new AppError('Booking not found', 404);

    await prisma.$transaction(async (tx) => {
      await tx.payment.deleteMany({ where: { bookingId: id } });
      await tx.booking.delete({ where: { id } });
    });

    // Only mark room available if nobody is checked in there any more.
    const stillOccupied = await prisma.booking.count({ where: { roomId: booking.roomId, status: 'CHECKED_IN' } });
    if (stillOccupied === 0) {
      await prisma.room.updateMany({ where: { id: booking.roomId, status: 'BOOKED' }, data: { status: 'AVAILABLE' } });
    }

    res.json({ success: true, message: 'Booking deleted successfully' });
  } catch (error) { next(error); }
};
