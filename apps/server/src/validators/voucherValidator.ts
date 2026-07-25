import { z } from 'zod';

const itemSchema = z.object({
  itemType: z.enum(['ROOM', 'DAY_LONG_PRODUCT', 'MENU_ITEM']),
  itemId: z.string().uuid(),
});

export const voucherCreateSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional().nullable(),
  code: z.string().min(4).max(32).optional(), // if omitted, auto-generate
  bulkCount: z.number().int().min(1).max(200).optional(), // generate N codes with same rules
  discountType: z.enum(['PERCENT', 'FIXED']),
  discountValue: z.number().positive(),
  scope: z.enum(['OVERALL', 'SELECTED_ITEMS']).default('OVERALL'),
  appliesRoom: z.boolean().default(true),
  appliesDayLong: z.boolean().default(true),
  appliesRestaurant: z.boolean().default(true),
  minSpend: z.number().nonnegative().optional().nullable(),
  maxDiscountAmount: z.number().positive().optional().nullable(),
  startsAt: z.string().optional().nullable(),
  expiresAt: z.string().optional().nullable(),
  maxRedemptions: z.number().int().positive().optional().nullable(),
  maxPerAssignee: z.number().int().positive().optional().nullable(),
  isSecure: z.boolean().default(true),
  assigneeType: z.enum(['NONE', 'GUEST', 'USER', 'SHAREHOLDER']).default('NONE'),
  assigneeId: z.string().uuid().optional().nullable(),
  items: z.array(itemSchema).optional().default([]),
});

export const voucherUpdateSchema = voucherCreateSchema
  .omit({ code: true, bulkCount: true })
  .partial()
  .extend({
    isActive: z.boolean().optional(),
  });

export const voucherValidateSchema = z.object({
  code: z.string().min(1),
  channel: z.enum(['ROOM', 'DAY_LONG', 'RESTAURANT']),
  grossAmount: z.number().nonnegative(),
  lineItems: z
    .array(
      z.object({
        itemType: z.enum(['ROOM', 'DAY_LONG_PRODUCT', 'MENU_ITEM']),
        itemId: z.string().uuid(),
        amount: z.number().nonnegative(),
      })
    )
    .optional(),
  guestId: z.string().uuid().optional().nullable(),
  guestEmail: z.string().email().optional().nullable(),
  userId: z.string().uuid().optional().nullable(),
  shareholderId: z.string().uuid().optional().nullable(),
});
