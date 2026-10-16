import { z } from 'zod';
import { isYmd } from '../utils/dateRange';

export const FINANCE_ENTRY_TYPES = [
  'OPENING_CASH',
  'OPENING_FIXED_ASSET',
  'OPENING_LIABILITY',
  'LOAN_RECEIVED',
  'LOAN_REPAID',
  'CAPITAL_IN',
  'CAPITAL_OUT',
] as const;

/** Entry types that move money through a cash/bank/mobile account (method required). */
export const CASH_MOVING_TYPES = ['OPENING_CASH', 'LOAN_RECEIVED', 'LOAN_REPAID', 'CAPITAL_IN', 'CAPITAL_OUT'] as const;

const PAYMENT_METHODS = ['CASH', 'BKASH', 'NAGAD', 'CARD', 'STRIPE', 'BANK_TRANSFER', 'MOBILE_BANKING'] as const;

export const financeEntrySchema = z
  .object({
    type: z.enum(FINANCE_ENTRY_TYPES),
    amount: z.number().positive('Amount must be positive'),
    method: z.enum(PAYMENT_METHODS).nullable().optional(),
    date: z.string().refine(isYmd, 'Date must be YYYY-MM-DD'),
    description: z.string().max(300, 'Description is too long').nullable().optional(),
  })
  .superRefine((v, ctx) => {
    if ((CASH_MOVING_TYPES as readonly string[]).includes(v.type) && !v.method) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['method'],
        message: 'Choose which cash, mobile or bank account the money moved through',
      });
    }
  });

export const statementQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

export type FinanceEntryInput = z.infer<typeof financeEntrySchema>;
