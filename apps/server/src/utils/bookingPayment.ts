import { PaymentMethod, Prisma } from '@prisma/client';
import prisma from './prisma';
import { round2 } from './bookingPricing';

type BookingPaymentSource = {
  id: string;
  totalAmount: number;
  /** Website bookings: what the guest pays now (see `confirmationThreshold`). Null = whole total. */
  advanceAmount?: number | null;
  preferredPaymentTiming?: string | null;
  preferredPaymentMethod?: string | null;
  paymentTransactionId?: string | null;
  paymentProofImage?: string | null;
};

/** Tolerance for float sums of taka amounts (half a paisa). */
const CONFIRM_EPSILON = 0.005;

/**
 * Amount that has to be COMPLETED (net of refunds) before a PENDING booking becomes CONFIRMED:
 * the website advance when one was agreed, otherwise the whole invoice. Never above the total
 * and never negative.
 */
export function confirmationThreshold(booking: { totalAmount: number; advanceAmount?: number | null }): number {
  const total = Math.max(0, booking.totalAmount);
  const advance = booking.advanceAmount;
  if (advance === null || advance === undefined || !Number.isFinite(advance)) return total;
  return round2(Math.min(total, Math.max(0, advance)));
}

/** True once `paid` (COMPLETED payments net of refunds) reaches the booking's confirmation threshold. */
export function reachesConfirmation(
  paid: number,
  booking: { totalAmount: number; advanceAmount?: number | null }
): boolean {
  return paid >= confirmationThreshold(booking) - CONFIRM_EPSILON;
}

export function mapBookingPaymentMethod(method?: string | null): PaymentMethod {
  switch (method) {
    case 'BKASH':
      return 'BKASH';
    case 'NAGAD':
      return 'NAGAD';
    case 'MOBILE_BANKING':
      return 'MOBILE_BANKING';
    case 'BANK_TRANSFER':
      return 'BANK_TRANSFER';
    case 'STRIPE':
      return 'STRIPE';
    case 'CARD':
      return 'CARD';
    case 'CASH':
    default:
      return 'CASH';
  }
}

export function buildPaymentNotesFromBooking(booking: BookingPaymentSource): string | undefined {
  const parts: string[] = [];

  if (booking.preferredPaymentTiming === 'INSTANT') {
    parts.push('Submitted via website (instant payment)');
  } else if (booking.preferredPaymentTiming === 'LATER') {
    parts.push('Website booking — pay later');
  }

  if (booking.preferredPaymentMethod === 'BANK_TRANSFER') {
    parts.push('Bank transfer');
  }

  if (booking.paymentProofImage) {
    parts.push('Payment proof attached on booking');
  }

  const advance = booking.advanceAmount;
  if (advance !== null && advance !== undefined && booking.totalAmount > 0 && advance < booking.totalAmount) {
    const pct = Math.round((advance / booking.totalAmount) * 100);
    parts.push(`Advance ${pct}% of ৳${booking.totalAmount}`);
  }

  return parts.length > 0 ? parts.join('. ') : undefined;
}

export async function createPaymentFromBooking(
  tx: Prisma.TransactionClient,
  booking: BookingPaymentSource
) {
  const existing = await tx.payment.findFirst({
    where: { bookingId: booking.id },
    select: { id: true },
  });
  if (existing) return null;

  const isInstant = booking.preferredPaymentTiming === 'INSTANT';
  // The PENDING row carries what the guest agreed to pay now (website advance) or the whole total.
  const amount = confirmationThreshold(booking);
  if (amount <= 0) return null;

  return tx.payment.create({
    data: {
      bookingId: booking.id,
      amount,
      method: isInstant
        ? mapBookingPaymentMethod(booking.preferredPaymentMethod)
        : 'CASH',
      status: 'PENDING',
      transactionId: isInstant ? booking.paymentTransactionId?.trim() || undefined : undefined,
      notes: buildPaymentNotesFromBooking(booking),
      referenceType: 'BOOKING',
      referenceId: booking.id,
      businessLine: 'ROOM',
    },
  });
}

/**
 * Ids of the bookings matching `where` that carry a payment receipt. List endpoints omit the
 * base64 `paymentProofImage` column (it can be megabytes per row) and expose `hasPaymentProof`
 * from this cheap id-only query instead; the detail endpoints still return the image.
 */
export async function bookingIdsWithPaymentProof(where: Prisma.BookingWhereInput): Promise<Set<string>> {
  const rows = await prisma.booking.findMany({
    where: { AND: [where, { NOT: [{ paymentProofImage: null }, { paymentProofImage: '' }] }] },
    select: { id: true },
  });
  return new Set(rows.map((r) => r.id));
}

export async function syncBookingPaymentIfMissing(booking: BookingPaymentSource) {
  return prisma.$transaction(async (tx) => createPaymentFromBooking(tx, booking));
}

export async function backfillMissingBookingPayments() {
  const bookings = await prisma.booking.findMany({
    where: {
      payments: { none: {} },
      preferredPaymentTiming: { not: null },
    },
    select: {
      id: true,
      totalAmount: true,
      advanceAmount: true,
      preferredPaymentTiming: true,
      preferredPaymentMethod: true,
      paymentTransactionId: true,
      paymentProofImage: true,
    },
  });

  let created = 0;
  for (const booking of bookings) {
    const payment = await syncBookingPaymentIfMissing(booking);
    if (payment) created += 1;
  }
  return created;
}
