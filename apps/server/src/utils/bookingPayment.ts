import { PaymentMethod, Prisma } from '@prisma/client';
import prisma from './prisma';

type BookingPaymentSource = {
  id: string;
  totalAmount: number;
  preferredPaymentTiming?: string | null;
  preferredPaymentMethod?: string | null;
  paymentTransactionId?: string | null;
  paymentProofImage?: string | null;
};

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

  return tx.payment.create({
    data: {
      bookingId: booking.id,
      amount: booking.totalAmount,
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
