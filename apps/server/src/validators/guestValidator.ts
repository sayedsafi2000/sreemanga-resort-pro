import { z } from 'zod';

/** Require at least 10 digits (formatting characters ignored). */
export function phoneDigitsMin(min = 10) {
  return z
    .string()
    .trim()
    .refine((v) => v.replace(/\D/g, '').length >= min, {
      message: `Phone must be at least ${min} digits`,
    });
}

export const guestSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: phoneDigitsMin(10),
  nid: z.string().optional(),
  passport: z.string().optional(),
  address: z.string().optional(),
  email: z.string().email('Invalid email address').optional(),
});

export type GuestInput = z.infer<typeof guestSchema>;
