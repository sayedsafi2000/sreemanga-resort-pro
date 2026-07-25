import { z } from 'zod';

/** YYYY-MM-DD or full ISO datetime (admin / integrations). */
const stayDateString = z.string().min(8, 'Invalid date');

export const bookingSchema = z
  .object({
    roomId: z.string().uuid('Invalid room ID'),
    /** Pick an existing guest, or omit and send guestName + guestPhone (website-style). */
    guestId: z.string().uuid('Invalid guest ID').optional(),
    guestName: z.string().min(2).optional(),
    guestPhone: z.string().min(10).optional(),
    guestEmail: z.union([z.string().email(), z.literal('')]).optional(),
    adults: z.number().int().min(1).max(20).default(1),
    children: z.number().int().min(0).max(20).default(0),
    preferredPaymentTiming: z.enum(['INSTANT', 'LATER']).optional(),
    preferredPaymentMethod: z.enum(['BKASH', 'BANK_TRANSFER']).optional(),
    paymentTransactionId: z.string().min(4).max(100).optional(),
    paymentProofImage: z.string().optional(),
    checkInDate: stayDateString,
    checkOutDate: stayDateString,
    status: z.enum(['PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED']).optional(),
    notes: z.string().optional(),
    voucherCode: z.string().min(1).optional(),
  })
  .superRefine((data, ctx) => {
    const hasGuestId = Boolean(data.guestId?.trim());
    const hasNewGuest = Boolean(data.guestName?.trim() && data.guestPhone?.trim());
    if (!hasGuestId && !hasNewGuest) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Select an existing guest or enter name and phone for a new guest',
        path: ['guestName'],
      });
    }
    if (hasGuestId && hasNewGuest) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Use either an existing guest or new guest details, not both',
        path: ['guestId'],
      });
    }
    if (data.preferredPaymentTiming === 'INSTANT') {
      if (!data.preferredPaymentMethod) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Payment method is required for instant payment',
          path: ['preferredPaymentMethod'],
        });
      }
      if (!data.paymentTransactionId?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Transaction ID is required for instant payment',
          path: ['paymentTransactionId'],
        });
      }
    }
  });

export const updateBookingSchema = z.object({
  adults: z.number().int().min(1).max(20).optional(),
  children: z.number().int().min(0).max(20).optional(),
  preferredPaymentTiming: z.enum(['INSTANT', 'LATER']).optional().nullable(),
  preferredPaymentMethod: z.enum(['BKASH', 'BANK_TRANSFER']).optional().nullable(),
  paymentTransactionId: z.string().min(4).max(100).optional().nullable(),
  paymentProofImage: z.string().optional().nullable(),
  staffId: z.string().uuid().optional().nullable(),
  status: z.enum(['PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED']).optional(),
  notes: z.string().optional(),
}).partial();

export type BookingInput = z.infer<typeof bookingSchema>;
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;