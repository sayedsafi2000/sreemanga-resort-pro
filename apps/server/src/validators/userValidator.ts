import { z } from 'zod';

const optionalPhone = z
  .union([z.string().trim().min(6, 'Phone must be at least 6 characters'), z.literal(''), z.null()])
  .optional()
  .transform((v) => (v === '' || v == null ? null : v));

/** Staff roles creatable from Users admin (portal logins use SHAREHOLDER via Shareholders). */
const staffRoleEnum = z.enum([
  'SUPER_ADMIN',
  'MANAGER',
  'RECEPTIONIST',
  'HOUSEKEEPING',
  'RESTAURANT_STAFF',
  'ACCOUNTANT',
]);

const userRoleEnum = z.enum([
  'SUPER_ADMIN',
  'MANAGER',
  'RECEPTIONIST',
  'HOUSEKEEPING',
  'RESTAURANT_STAFF',
  'ACCOUNTANT',
  'SHAREHOLDER',
]);

export const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: optionalPhone,
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: staffRoleEnum,
});

export const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: optionalPhone,
  role: userRoleEnum.optional(),
}).partial();

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(6).optional(),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
