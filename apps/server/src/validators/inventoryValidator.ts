import { z } from 'zod';

export const inventoryItemSchema = z.object({
  sku: z.string().optional().nullable(),
  name: z.string().min(2, 'Name is required'),
  category: z.enum(['FOOD_ITEM', 'AMENITY', 'PRODUCT', 'SUPPLY', 'ASSET']),
  unit: z.string().min(1, 'Unit is required'),
  currentStock: z.number().nonnegative().optional(),
  reorderLevel: z.number().nonnegative().optional(),
  costPrice: z.number().nonnegative().optional(),
  sellPrice: z.number().nonnegative().optional().nullable(),
  supplierId: z.string().uuid().optional().nullable(),
  expenseAccountCode: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  notes: z.string().optional().nullable(),
});

export const supplierSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const adjustmentSchema = z.object({
  itemId: z.string().uuid(),
  quantity: z.number(), // signed: + adds, - removes
  notes: z.string().optional().nullable(),
});

export const issueSchema = z.object({
  itemId: z.string().uuid(),
  quantity: z.number().positive(),
  referenceType: z.string().optional().nullable(),
  referenceId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const purchaseSchema = z.object({
  supplierId: z.string().uuid().optional().nullable(),
  date: z.string().optional(),
  notes: z.string().optional().nullable(),
  lines: z
    .array(
      z.object({
        itemId: z.string().uuid(),
        quantity: z.number().positive(),
        unitCost: z.number().nonnegative(),
      })
    )
    .min(1, 'At least one line is required'),
});

export const recipeSchema = z.object({
  menuItemId: z.string().uuid(),
  ingredients: z
    .array(
      z.object({
        itemId: z.string().uuid(),
        quantity: z.number().positive(),
      })
    )
    .default([]),
});
