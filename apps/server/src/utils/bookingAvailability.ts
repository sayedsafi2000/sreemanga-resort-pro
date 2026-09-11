import type { Prisma } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';

/** Booking statuses that occupy a room. */
export const ACTIVE_BOOKING_STATUSES = ['PENDING', 'CONFIRMED', 'CHECKED_IN'] as const;

export type StayRange = { checkInDate: Date; checkOutDate: Date };

/**
 * A stay is the half-open interval [checkIn, checkOut): the guest occupies the
 * nights from check-in up to, but not including, the checkout date. Two stays
 * conflict only when they share a night, so a new guest may check in on the
 * day another checks out (standard hotel turnover).
 */
export function staysOverlap(a: StayRange, b: StayRange): boolean {
  return a.checkInDate < b.checkOutDate && a.checkOutDate > b.checkInDate;
}

/** Prisma `where` fragment: active bookings that share at least one night with the stay. */
export function overlappingStayWhere(checkIn: Date, checkOut: Date): Prisma.BookingWhereInput {
  return {
    status: { in: [...ACTIVE_BOOKING_STATUSES] },
    checkInDate: { lt: checkOut },
    checkOutDate: { gt: checkIn },
  };
}

/** True when `date` is an occupied night of the booking (the checkout day is free). */
export function isNightBooked(date: Date, booking: StayRange): boolean {
  return booking.checkInDate <= date && booking.checkOutDate > date;
}

/**
 * Serialises booking writes for one room until the transaction ends. Two
 * concurrent requests for the same room queue here, so the second one sees
 * the first one's booking when it runs `assertRoomAvailable`.
 */
export async function lockRoomForBooking(tx: Prisma.TransactionClient, roomId: string): Promise<void> {
  // $executeRaw, not $queryRaw: pg_advisory_xact_lock returns `void`, which
  // Prisma cannot deserialise as a result column.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${roomId}))`;
}

/** Throws 400 when the room already has an active booking sharing a night with the stay. */
export async function assertRoomAvailable(
  tx: Prisma.TransactionClient,
  roomId: string,
  checkIn: Date,
  checkOut: Date,
  excludeBookingId?: string
): Promise<void> {
  const conflicts = await tx.booking.count({
    where: {
      roomId,
      ...overlappingStayWhere(checkIn, checkOut),
      ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
    },
  });
  if (conflicts > 0) {
    throw new AppError('Room is not available for the selected dates', 400);
  }
}
