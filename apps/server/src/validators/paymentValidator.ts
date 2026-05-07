import { z } from 'zod';

export const paymentSchema = z.object({
  bookingId: z.string().uuid('Invalid booking ID'),
  amount: z.number().positive('Amount must be positive'),
  method: z.enum(['CASH', 'BKASH', 'NAGAD', 'CARD']),
  transactionId: z.string().optional(),
  notes: z.string().optional(),
});

export const updatePaymentSchema = z.object({
  status: z.enum(['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED']).optional(),
  transactionId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type PaymentInput = z.infer<typeof paymentSchema>;
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;
