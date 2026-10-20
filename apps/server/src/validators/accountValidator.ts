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

// transactionDate: 'YYYY-MM-DD' (format + future check happen in the controller via localNoon);
// empty/null = today.
export const manualTxnSchema = z.object({
  direction: z.enum(['IN', 'OUT']),
  amount: z.number().positive(),
  description: z.string().max(300).optional().nullable(),
  transactionDate: z.string().optional().nullable(),
});

/** Edit of a user-made ledger row (MANUAL / TRANSFER leg). Every field optional = unchanged. */
export const txnUpdateSchema = z.object({
  amount: z.number().positive().optional(),
  direction: z.enum(['IN', 'OUT']).optional(),
  description: z.string().max(300).optional().nullable(),
  transactionDate: z.string().optional().nullable(),
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

/** Edit while OPEN / PARTIAL: identity, amount (never below what was collected), due date, notes. */
export const receivableUpdateSchema = receivableSchema
  .pick({ customerName: true, amount: true, dueDate: true, notes: true })
  .partial();

export const receivableCollectSchema = z.object({
  amount: z.number().positive(),
  method: z.enum(['CASH', 'BKASH', 'NAGAD', 'CARD', 'BANK_TRANSFER', 'MOBILE_BANKING']),
  notes: z.string().optional().nullable(),
});
