import { z } from 'zod';

export const guestSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(10, 'Phone must be at least 10 characters'),
  nid: z.string().optional(),
  passport: z.string().optional(),
  address: z.string().optional(),
  email: z.string().email('Invalid email address').optional(),
});

export type GuestInput = z.infer<typeof guestSchema>;