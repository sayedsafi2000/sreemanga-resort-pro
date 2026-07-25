import { z } from 'zod';

export const shareholderSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  phone: z
    .string()
    .trim()
    .refine((v) => v.replace(/\D/g, '').length >= 10, {
      message: 'Phone must be at least 10 digits',
    }),
  email: z.string().email().optional().nullable().or(z.literal('')),
  address: z.string().optional().nullable(),
  nid: z.string().optional().nullable(),
  shareType: z.enum(['PERCENTAGE', 'FIXED', 'CUSTOM']).default('PERCENTAGE'),
  shareValue: z.number().nonnegative().default(0),
  totalShares: z.number().int().positive().optional().nullable(),
  investmentAmount: z.number().nonnegative().optional().nullable(),
  joinDate: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  notes: z.string().optional().nullable(),
  // Optional login account creation (create or attach on edit).
  createLogin: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

export const distributionSchema = z.object({
  periodLabel: z.string().min(1, 'Period label is required'),
  periodStart: z.string(),
  periodEnd: z.string(),
  totalProfit: z.number(),
  notes: z.string().optional().nullable(),
});

export const customSharesSchema = z.object({
  shares: z.array(z.object({ shareholderId: z.string().uuid(), amount: z.number().nonnegative() })),
});
