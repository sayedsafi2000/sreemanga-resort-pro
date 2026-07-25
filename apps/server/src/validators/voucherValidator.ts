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

function optionalNonNegNumber() {
  return z.preprocess((val) => {
    if (val === '' || val === null || val === undefined) return null;
    if (typeof val === 'number' && Number.isNaN(val)) return null;
    if (typeof val === 'string') {
      const t = val.trim();
      if (!t) return null;
      const n = Number(t);
      return Number.isNaN(n) ? null : n;
    }
    return val;
  }, z.number().nonnegative().nullable().optional());
}

function optionalPositiveNumber() {
  return z.preprocess((val) => {
    if (val === '' || val === null || val === undefined) return null;
    if (typeof val === 'number' && Number.isNaN(val)) return null;
    if (typeof val === 'string') {
      const t = val.trim();
      if (!t) return null;
      const n = Number(t);
      return Number.isNaN(n) ? null : n;
    }
    return val;
  }, z.number().positive().nullable().optional());
}

function optionalPositiveInt() {
  return z.preprocess((val) => {
    if (val === '' || val === null || val === undefined) return null;
    if (typeof val === 'number' && Number.isNaN(val)) return null;
    if (typeof val === 'string') {
      const t = val.trim();
      if (!t) return null;
      const n = Number(t);
      return Number.isNaN(n) ? null : n;
    }
    return val;
  }, z.number().int().positive().nullable().optional());
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
    minSpend: optionalNonNegNumber(),
    maxDiscountAmount: optionalPositiveNumber(),
    startsAt: z.string().optional().nullable(),
    expiresAt: z.string().optional().nullable(),
    maxRedemptions: optionalPositiveInt(),
    maxPerAssignee: optionalPositiveInt(),
    isSecure: z.boolean().default(true),
    audienceAllGuests: z.boolean().default(false),
    audienceAllStaff: z.boolean().default(false),
    audienceAllShareholders: z.boolean().default(false),
    /** Multi-assignee (preferred). Empty = public unless All flags set. */
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
    minSpend: optionalNonNegNumber(),
    maxDiscountAmount: optionalPositiveNumber(),
    startsAt: z.string().optional().nullable(),
    expiresAt: z.string().optional().nullable(),
    maxRedemptions: optionalPositiveInt(),
    maxPerAssignee: optionalPositiveInt(),
    isSecure: z.boolean().optional(),
    isActive: z.boolean().optional(),
    audienceAllGuests: z.boolean().optional(),
    audienceAllStaff: z.boolean().optional(),
    audienceAllShareholders: z.boolean().optional(),
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
  guestId: z.preprocess((val) => {
    if (val === '' || val === null || val === undefined) return null;
    if (typeof val === 'string' && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val)) {
      return null; // synthetic ids like shareholder:… — use email instead
    }
    return val;
  }, z.string().uuid().optional().nullable()),
  guestEmail: z.preprocess((val) => {
    if (val === '' || val === null || val === undefined) return null;
    return val;
  }, z.string().email().optional().nullable()),
  userId: z.preprocess((val) => {
    if (val === '' || val === null || val === undefined) return null;
    if (typeof val === 'string' && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val)) {
      return null;
    }
    return val;
  }, z.string().uuid().optional().nullable()),
  shareholderId: z.preprocess((val) => {
    if (val === '' || val === null || val === undefined) return null;
    if (typeof val === 'string' && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val)) {
      return null;
    }
    return val;
  }, z.string().uuid().optional().nullable()),
});

export const voucherForEmailSchema = z.object({
  email: z.string().email(),
});

export { assertChannelItemAlignment, normalizeAssignees };
