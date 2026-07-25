import { z } from 'zod';

const slotSchema = z.object({
  start: z.string(),
  end: z.string(),
  label: z.string().optional(),
});

export const dayLongProductSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  category: z.enum(['POOL', 'COTTAGE', 'CONFERENCE', 'EVENT', 'PICNIC']),
  description: z.string().optional().nullable(),
  images: z.array(z.string().max(12_000_000)).optional(),
  basePrice: z.number().nonnegative('Base price must be >= 0'),
  pricePerPerson: z.number().nonnegative().optional().nullable(),
  maxCapacity: z.number().int().positive().optional().nullable(),
  minCapacity: z.number().int().positive().optional().nullable(),
  facilities: z.array(z.string()).optional().nullable(),
  availableSlots: z.array(slotSchema).optional().nullable(),
  duration: z.number().int().positive().optional().nullable(),
  bookingRules: z.any().optional().nullable(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const dayLongBookingSchema = z
  .object({
    productId: z.string().uuid(),
    guestName: z.string().min(2, 'Guest name is required'),
    guestPhone: z.string().min(6, 'Phone is required'),
    guestEmail: z.string().email().optional().nullable(),
    guestNid: z.string().optional().nullable(),
    guestAddress: z.string().optional().nullable(),
    bookingDate: z.string(),
    slotStart: z.string(),
    slotEnd: z.string(),
    adults: z.number().int().min(1).default(1),
    children: z.number().int().min(0).default(0),
    notes: z.string().optional().nullable(),
    preferredPaymentTiming: z.enum(['INSTANT', 'LATER']).optional().nullable(),
    preferredPaymentMethod: z.string().optional().nullable(),
    paymentTransactionId: z.string().optional().nullable(),
    paymentProofImage: z.string().max(12_000_000).optional().nullable(),
    voucherCode: z.string().min(1).optional().nullable(),
  })
  .refine((d) => d.slotEnd > d.slotStart, {
    message: 'slotEnd must be after slotStart',
    path: ['slotEnd'],
  });

export const dayLongBookingUpdateSchema = z.object({
  status: z
    .enum(['PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED'])
    .optional(),
  notes: z.string().optional().nullable(),
  adults: z.number().int().min(1).optional(),
  children: z.number().int().min(0).optional(),
  slotStart: z.string().optional(),
  slotEnd: z.string().optional(),
  bookingDate: z.string().optional(),
});
