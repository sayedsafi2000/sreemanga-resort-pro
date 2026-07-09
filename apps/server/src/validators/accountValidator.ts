import { z } from 'zod';

const ACCOUNT_TYPES = [
  'CASH', 'BANK', 'MOBILE_BANKING', 'RECEIVABLE', 'PAYABLE',
  'ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE',
] as const;

export const accountSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(2, 'Name is required'),
  type: z.enum(ACCOUNT_TYPES),
  parentId: z.string().uuid().optional().nullable(),
  description: z.string().optional().nullable(),
  openingBalance: z.number().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const accountUpdateSchema = accountSchema.partial().omit({ code: true });

export const manualTxnSchema = z.object({
  direction: z.enum(['IN', 'OUT']),
  amount: z.number().positive(),
  description: z.string().optional().nullable(),
  transactionDate: z.string().optional(),
});

export const transferSchema = z.object({
  fromAccountId: z.string().uuid(),
  toAccountId: z.string().uuid(),
  amount: z.number().positive(),
  description: z.string().optional().nullable(),
});

export const receivableSchema = z.object({
  customerName: z.string().min(2, 'Customer name is required'),
  amount: z.number().positive(),
  dueDate: z.string().optional().nullable(),
  referenceType: z.string().optional().nullable(),
  referenceId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const receivableCollectSchema = z.object({
  amount: z.number().positive(),
  method: z.enum(['CASH', 'BKASH', 'NAGAD', 'CARD', 'BANK_TRANSFER', 'MOBILE_BANKING']),
  notes: z.string().optional().nullable(),
});
