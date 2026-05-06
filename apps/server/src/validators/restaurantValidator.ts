import { z } from 'zod';

export const menuSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  price: z.number().positive('Price must be positive'),
  category: z.string().min(1, 'Category is required'),
  description: z.string().optional(),
  image: z.string().optional(),
  isAvailable: z.boolean().optional(),
});

export const updateMenuSchema = menuSchema.partial();

export const orderSchema = z.object({
  roomId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  items: z.array(z.object({
    menuId: z.string().uuid(),
    name: z.string(),
    price: z.number(),
    quantity: z.number().int().positive(),
  })),
  totalPrice: z.number().positive(),
  notes: z.string().optional(),
});

export const updateOrderSchema = z.object({
  status: z.enum(['PENDING', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED']).optional(),
  notes: z.string().optional(),
});

export type MenuInput = z.infer<typeof menuSchema>;
export type OrderInput = z.infer<typeof orderSchema>;
