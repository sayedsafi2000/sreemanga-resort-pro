import { z } from 'zod';

export const settingSchema = z.object({
  key: z.string().min(1, 'Key is required'),
  value: z.string(),
  description: z.string().optional(),
  type: z.string().optional(),
});

export const updateSettingSchema = z.object({
  value: z.string(),
  description: z.string().optional(),
  type: z.string().optional(),
});

export const bulkSettingsSchema = z.object({
  settings: z.array(z.object({
    key: z.string(),
    value: z.string(),
  })),
});

export type SettingInput = z.infer<typeof settingSchema>;
