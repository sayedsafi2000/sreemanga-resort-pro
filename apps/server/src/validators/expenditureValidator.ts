import { z } from 'zod';

export const EXPENSE_STATUSES = ['PAID', 'PENDING', 'CANCELLED'] as const;
export const EXPENSE_PAYMENT_METHODS = ['CASH', 'BKASH', 'NAGAD', 'CARD'] as const;

// Single attachment as data URL or external URL. Cap below the 10mb express body
// limit so we reject oversized payloads with a useful message instead of a 413.
const ATTACHMENT_MAX_BYTES = 8_000_000;

const categoryFieldSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(['text', 'number', 'date', 'textarea', 'select']),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(),
});

export const expenditureCategorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  isActive: z.boolean().optional(),
  sortOrder: z.number().optional(),
  fields: z.array(categoryFieldSchema).optional(),
});

export const expenditureSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  amount: z.number().positive('Amount must be positive'),
  categoryId: z.string().uuid('Invalid category ID'),
  date: z.string().transform((s) => new Date(s)),
  paymentMethod: z.enum(EXPENSE_PAYMENT_METHODS).optional(),
  paidTo: z.string().optional(),
  description: z.string().optional(),
  attachment: z.string().max(ATTACHMENT_MAX_BYTES, 'Attachment too large (max 8mb)').optional(),
  status: z.enum(EXPENSE_STATUSES).default('PAID'),
  metadata: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
});

export const expenditureListQuerySchema = z.object({
  categoryId: z.string().uuid().optional(),
  status: z.enum(EXPENSE_STATUSES).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  search: z.string().max(200).optional(),
});

export type ExpenditureInput = z.infer<typeof expenditureSchema>;
export type ExpenditureCategoryInput = z.infer<typeof expenditureCategorySchema>;
export type ExpenditureListQuery = z.infer<typeof expenditureListQuerySchema>;
