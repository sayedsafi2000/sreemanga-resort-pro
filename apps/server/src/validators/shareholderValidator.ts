import { z } from 'zod';

export const shareholderSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  phone: z.string().min(6, 'Phone is required'),
  email: z.string().email().optional().nullable(),
  address: z.string().optional().nullable(),
  nid: z.string().optional().nullable(),
  shareType: z.enum(['PERCENTAGE', 'FIXED', 'CUSTOM']).default('PERCENTAGE'),
  shareValue: z.number().nonnegative().default(0),
  totalShares: z.number().int().positive().optional().nullable(),
  investmentAmount: z.number().nonnegative().optional().nullable(),
  isActive: z.boolean().optional(),
  notes: z.string().optional().nullable(),
  // Optional login account creation.
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
