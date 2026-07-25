import { z } from 'zod';

const itemSchema = z.object({
  itemType: z.enum(['ROOM', 'DAY_LONG_PRODUCT', 'MENU_ITEM']),
  itemId: z.string().uuid(),
});

const assigneeEntrySchema = z.object({
  assigneeType: z.enum(['GUEST', 'USER', 'SHAREHOLDER']),
  assigneeId: z.string().uuid(),
});

const channelItemType: Record<string, 'appliesRoom' | 'appliesDayLong' | 'appliesRestaurant'> = {
  ROOM: 'appliesRoom',
  DAY_LONG_PRODUCT: 'appliesDayLong',
  MENU_ITEM: 'appliesRestaurant',
};

function assertChannelItemAlignment(data: {
  appliesRoom: boolean;
  appliesDayLong: boolean;
  appliesRestaurant: boolean;
  scope: string;
  items?: { itemType: string; itemId: string }[];
}) {
  if (!data.appliesRoom && !data.appliesDayLong && !data.appliesRestaurant) {
    return { message: 'Select at least one channel (Room, Day Long, or Restaurant)', path: ['appliesRoom'] };
  }
  if (data.scope === 'SELECTED_ITEMS') {
    if (!data.items || data.items.length === 0) {
      return { message: 'Select at least one item for Selected items scope', path: ['items'] };
    }
    for (const item of data.items) {
      const flag = channelItemType[item.itemType];
      if (!flag || !(data as any)[flag]) {
        return {
          message: `Item type ${item.itemType} requires its channel to be enabled`,
          path: ['items'],
        };
      }
    }
  }
  return null;
}

/** Prefer assignees[]; legacy assigneeType/assigneeId still accepted and normalized. */
function normalizeAssignees(data: {
  assignees?: { assigneeType: string; assigneeId: string }[];
  assigneeType?: string;
  assigneeId?: string | null;
}): { assigneeType: 'GUEST' | 'USER' | 'SHAREHOLDER'; assigneeId: string }[] {
  if (data.assignees && data.assignees.length > 0) {
    const seen = new Set<string>();
    const out: { assigneeType: 'GUEST' | 'USER' | 'SHAREHOLDER'; assigneeId: string }[] = [];
    for (const a of data.assignees) {
      if (a.assigneeType === 'NONE') continue;
      const key = `${a.assigneeType}:${a.assigneeId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        assigneeType: a.assigneeType as 'GUEST' | 'USER' | 'SHAREHOLDER',
        assigneeId: a.assigneeId,
      });
    }
    return out;
  }
  if (data.assigneeType && data.assigneeType !== 'NONE' && data.assigneeId) {
    return [
      {
        assigneeType: data.assigneeType as 'GUEST' | 'USER' | 'SHAREHOLDER',
        assigneeId: data.assigneeId,
      },
    ];
  }
  return [];
}

export const voucherCreateSchema = z
  .object({
    name: z.string().min(2),
    description: z.string().optional().nullable(),
    code: z.string().min(4).max(32).optional(),
    bulkCount: z.number().int().min(1).max(200).optional(),
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
    /** Multi-assignee (preferred). Empty = public. */
    assignees: z.array(assigneeEntrySchema).max(50).optional().default([]),
    /** Legacy single assignee — still accepted */
    assigneeType: z.enum(['NONE', 'GUEST', 'USER', 'SHAREHOLDER']).optional(),
    assigneeId: z.string().uuid().optional().nullable(),
    items: z.array(itemSchema).optional().default([]),
  })
  .superRefine((data, ctx) => {
    const err = assertChannelItemAlignment(data);
    if (err) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: err.message, path: err.path });
    }
  })
  .transform((data) => {
    const assignees = normalizeAssignees(data);
    return {
      ...data,
      assignees,
      assigneeType: assignees.length === 0 ? ('NONE' as const) : assignees[0]!.assigneeType,
      assigneeId: assignees.length === 0 ? null : assignees[0]!.assigneeId,
    };
  });

export const voucherUpdateSchema = z
  .object({
    name: z.string().min(2).optional(),
    description: z.string().optional().nullable(),
    discountType: z.enum(['PERCENT', 'FIXED']).optional(),
    discountValue: z.number().positive().optional(),
    scope: z.enum(['OVERALL', 'SELECTED_ITEMS']).optional(),
    appliesRoom: z.boolean().optional(),
    appliesDayLong: z.boolean().optional(),
    appliesRestaurant: z.boolean().optional(),
    minSpend: z.number().nonnegative().optional().nullable(),
    maxDiscountAmount: z.number().positive().optional().nullable(),
    startsAt: z.string().optional().nullable(),
    expiresAt: z.string().optional().nullable(),
    maxRedemptions: z.number().int().positive().optional().nullable(),
    maxPerAssignee: z.number().int().positive().optional().nullable(),
    isSecure: z.boolean().optional(),
    isActive: z.boolean().optional(),
    assignees: z.array(assigneeEntrySchema).max(50).optional(),
    assigneeType: z.enum(['NONE', 'GUEST', 'USER', 'SHAREHOLDER']).optional(),
    assigneeId: z.string().uuid().optional().nullable(),
    items: z.array(itemSchema).optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.scope === 'SELECTED_ITEMS' ||
      data.items !== undefined ||
      data.appliesRoom !== undefined ||
      data.appliesDayLong !== undefined ||
      data.appliesRestaurant !== undefined
    ) {
      if (
        data.appliesRoom === false &&
        data.appliesDayLong === false &&
        data.appliesRestaurant === false
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Select at least one channel',
          path: ['appliesRoom'],
        });
      }
      if (data.scope === 'SELECTED_ITEMS' || (data.items && data.items.length > 0)) {
        const err = assertChannelItemAlignment({
          appliesRoom: data.appliesRoom ?? true,
          appliesDayLong: data.appliesDayLong ?? true,
          appliesRestaurant: data.appliesRestaurant ?? true,
          scope: data.scope ?? 'SELECTED_ITEMS',
          items: data.items ?? [],
        });
        if (err) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: err.message, path: err.path });
        }
      }
    }
  })
  .transform((data) => {
    if (data.assignees === undefined && data.assigneeType === undefined) {
      return data;
    }
    const assignees = normalizeAssignees({
      assignees: data.assignees,
      assigneeType: data.assigneeType,
      assigneeId: data.assigneeId,
    });
    return {
      ...data,
      assignees,
      assigneeType: assignees.length === 0 ? ('NONE' as const) : assignees[0]!.assigneeType,
      assigneeId: assignees.length === 0 ? null : assignees[0]!.assigneeId,
    };
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

export const voucherForEmailSchema = z.object({
  email: z.string().email(),
});

export { assertChannelItemAlignment, normalizeAssignees };
