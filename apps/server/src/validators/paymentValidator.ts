import { z } from 'zod';

export const paymentSchema = z.object({
  bookingId: z.string().uuid('Invalid booking ID'),
  amount: z.number().positive('Amount must be positive'),
  method: z.enum(['CASH', 'BKASH', 'NAGAD', 'CARD', 'BANK_TRANSFER', 'MOBILE_BANKING']),
  transactionId: z.string().optional(),
  notes: z.string().optional(),
});

// REFUNDED is deliberately absent: refunds go through POST /payments/:id/refund so the amount
// and date are recorded. Legacy REFUNDED rows keep their status but can no longer be created.
export const updatePaymentSchema = z.object({
  status: z.enum(['PENDING', 'COMPLETED', 'FAILED']).optional(),
  transactionId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// Refunds may go back by any PaymentMethod (schema.prisma), not only the ones staff can collect by.
export const refundSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  method: z
    .enum(['CASH', 'BKASH', 'NAGAD', 'CARD', 'STRIPE', 'BANK_TRANSFER', 'MOBILE_BANKING'])
    .optional()
    .nullable(),
  /** Local calendar day the money went back; defaults to now. */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD').optional().nullable(),
  reason: z.string().trim().max(500, 'Reason must be 500 characters or fewer').optional().nullable(),
});

export type PaymentInput = z.infer<typeof paymentSchema>;
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;
export type RefundInput = z.infer<typeof refundSchema>;
