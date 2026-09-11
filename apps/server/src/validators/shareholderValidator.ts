import { z } from 'zod';

const phone = z
  .string()
  .trim()
  .refine((v) => v.replace(/\D/g, '').length >= 10, { message: 'Phone must be at least 10 digits' });

export const shareholderSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  phone,
  email: z.string().email().optional().nullable().or(z.literal('')),
  address: z.string().optional().nullable(),
  nid: z.string().optional().nullable(),
  joinDate: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  notes: z.string().optional().nullable(),
  // Optional portal login (create on insert, or attach later on edit).
  createLogin: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

export const SHARE_PAYMENT_METHODS = ['CASH', 'BKASH', 'NAGAD', 'CARD', 'BANK_TRANSFER', 'MOBILE_BANKING'] as const;

export const sharePaymentSchema = z.object({
  amount: z.number().positive('Amount must be greater than 0'),
  method: z.enum(SHARE_PAYMENT_METHODS).default('CASH'),
  transactionId: z.string().max(100).optional().nullable(),
  paidAt: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const holdingCreateSchema = z
  .object({
    tierId: z.string().uuid().optional(),
    tierCode: z.string().min(1).optional(),
    quantity: z.number().int().min(1, 'Quantity must be at least 1'),
    purchaseDate: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    initialPayment: sharePaymentSchema.optional().nullable(),
  })
  .refine((d) => d.tierId || d.tierCode, { message: 'Share tier is required', path: ['tierId'] });

export const holdingCancelSchema = z.object({
  refund: z.boolean().default(true),
  notes: z.string().optional().nullable(),
});

export const tierUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  unitPrice: z.number().positive().optional(),
  totalUnits: z.number().int().min(0).optional().nullable(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const distributionSchema = z.object({
  periodLabel: z.string().min(1, 'Period label is required'),
  periodStart: z.string(),
  periodEnd: z.string(),
  totalProfit: z.number(),
  notes: z.string().optional().nullable(),
});

/** amount null = drop the manual override and fall back to the calculated share. */
export const shareOverridesSchema = z.object({
  shares: z.array(z.object({ shareholderId: z.string().uuid(), amount: z.number().nonnegative().nullable() })),
});
