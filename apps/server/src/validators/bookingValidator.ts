import { z } from 'zod';

/** YYYY-MM-DD or full ISO datetime (admin / integrations). */
const stayDateString = z.string().min(8, 'Invalid date');

/** Soft phone check: count digits only (spaces/dashes/+ allowed). */
function phoneLooksValid(raw: string, minDigits = 10): boolean {
  return raw.replace(/\D/g, '').length >= minDigits;
}

const PAYMENT_METHODS = ['CASH', 'BKASH', 'NAGAD', 'CARD', 'BANK_TRANSFER', 'MOBILE_BANKING'] as const;
const BOOKING_STATUSES = ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED'] as const;
const GENDERS = ['MALE', 'FEMALE', 'OTHER'] as const;

/** Advance / instant payment recorded by the front desk while creating a booking. */
export const advancePaymentSchema = z.object({
  amount: z.number().positive('Advance must be greater than 0'),
  method: z.enum(PAYMENT_METHODS).default('CASH'),
  transactionId: z.string().max(100).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

const guestFields = {
  guestName: z.string().min(2).optional(),
  guestPhone: z.string().optional(),
  guestEmail: z.union([z.string().email(), z.literal('')]).optional(),
  guestNid: z.string().max(50).optional().nullable(),
  guestAddress: z.string().max(500).optional().nullable(),
  guestGender: z.enum(GENDERS).optional().nullable(),
  guestDob: z.string().optional().nullable(),
};

export const bookingSchema = z
  .object({
    roomId: z.string().uuid('Invalid room ID'),
    /** Pick an existing guest (guestId) and/or send guest details; guestId wins for identity, details update the record. */
    guestId: z.string().uuid('Invalid guest ID').optional(),
    ...guestFields,
    adults: z.number().int().min(1).max(20).default(1),
    children: z.number().int().min(0).max(20).default(0),
    extraPersons: z.number().int().min(0).max(10).default(0),
    /** Nightly rate override; defaults to the room price. */
    rate: z.number().nonnegative().optional(),
    extraCharge: z.number().nonnegative().default(0),
    extraChargeNote: z.string().max(200).optional().nullable(),
    staffDiscount: z.number().nonnegative().default(0),
    isVip: z.boolean().default(false),
    isForeigner: z.boolean().default(false),
    // Website-style "pay later / instant" hints (kept for the public flow + legacy admin dialog).
    preferredPaymentTiming: z.enum(['INSTANT', 'LATER']).optional(),
    preferredPaymentMethod: z.enum(['BKASH', 'NAGAD', 'BANK_TRANSFER']).optional(),
    paymentTransactionId: z.string().min(4).max(100).optional(),
    paymentProofImage: z.string().optional(),
    /** Front-desk advance recorded immediately as a COMPLETED payment. */
    advance: advancePaymentSchema.optional().nullable(),
    sendEmail: z.boolean().default(false),
    checkInDate: stayDateString,
    checkOutDate: stayDateString,
    status: z.enum(BOOKING_STATUSES).optional(),
    notes: z.string().optional(),
    voucherCode: z.string().min(1).optional(),
  })
  .superRefine((data, ctx) => {
    const hasGuestId = Boolean(data.guestId?.trim());
    const hasName = Boolean(data.guestName?.trim());
    const hasPhone = phoneLooksValid(data.guestPhone || '');
    if (!hasGuestId && !(hasName && hasPhone)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Select an existing guest or enter name and phone for a new guest',
        path: ['guestName'],
      });
    }
    if (!hasGuestId && hasName && !hasPhone) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Phone must be at least 10 digits', path: ['guestPhone'] });
    }
    if (data.preferredPaymentTiming === 'INSTANT' && !data.advance) {
      if (!data.preferredPaymentMethod) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Payment method is required for instant payment', path: ['preferredPaymentMethod'] });
      }
      if (!data.paymentTransactionId?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Transaction ID is required for instant payment', path: ['paymentTransactionId'] });
      }
    }
  });

export const updateBookingSchema = z
  .object({
    roomId: z.string().uuid().optional(),
    checkInDate: stayDateString.optional(),
    checkOutDate: stayDateString.optional(),
    adults: z.number().int().min(1).max(20).optional(),
    children: z.number().int().min(0).max(20).optional(),
    extraPersons: z.number().int().min(0).max(10).optional(),
    rate: z.number().nonnegative().optional().nullable(),
    extraCharge: z.number().nonnegative().optional(),
    extraChargeNote: z.string().max(200).optional().nullable(),
    staffDiscount: z.number().nonnegative().optional(),
    isVip: z.boolean().optional(),
    isForeigner: z.boolean().optional(),
    preferredPaymentTiming: z.enum(['INSTANT', 'LATER']).optional().nullable(),
    preferredPaymentMethod: z.enum(['BKASH', 'NAGAD', 'BANK_TRANSFER', 'STRIPE']).optional().nullable(),
    paymentTransactionId: z.string().min(4).max(100).optional().nullable(),
    paymentProofImage: z.string().optional().nullable(),
    staffId: z.string().uuid().optional().nullable(),
    status: z.enum(BOOKING_STATUSES).optional(),
    notes: z.string().optional().nullable(),
    /** Edit the guest record attached to the booking. */
    guest: z
      .object({
        name: z.string().min(2).optional(),
        phone: z.string().optional(),
        email: z.union([z.string().email(), z.literal('')]).optional().nullable(),
        nid: z.string().max(50).optional().nullable(),
        address: z.string().max(500).optional().nullable(),
        gender: z.enum(GENDERS).optional().nullable(),
        dateOfBirth: z.string().optional().nullable(),
      })
      .optional(),
  })
  .partial();

export type BookingInput = z.infer<typeof bookingSchema>;
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;
