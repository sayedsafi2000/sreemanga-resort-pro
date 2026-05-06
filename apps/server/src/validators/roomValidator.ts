import { z } from 'zod';

const addOnSchema = z.object({
  name: z.string().min(1),
  price: z.number().nonnegative(),
  description: z.string().optional(),
});

export const roomSchema = z.object({
  name: z.string().min(2, 'Room name must be at least 2 characters'),
  roomCode: z.string().optional(),
  type: z.enum(['STANDARD', 'DELUXE', 'SUITE', 'FAMILY', 'PRESIDENTIAL']),
  price: z.number().positive('Price must be positive'),
  weekendPrice: z.number().nonnegative().optional(),
  seasonalPrice: z.number().nonnegative().optional(),
  extraGuestCharge: z.number().nonnegative().optional(),
  capacity: z.number().int().positive('Capacity must be a positive integer').optional(),
  floorBuilding: z.string().optional(),
  roomSizeSqft: z.number().int().positive().optional(),
  maxAdults: z.number().int().positive().optional(),
  maxChildren: z.number().int().nonnegative().optional(),
  bedType: z.enum(['SINGLE', 'DOUBLE', 'KING', 'TWIN']).optional(),
  status: z.enum(['AVAILABLE', 'BOOKED', 'CLEANING', 'MAINTENANCE']).optional(),
  description: z.string().optional(),
  mainImage: z.string().optional(),
  images: z.array(z.string()).optional(),
  facilities: z.record(z.boolean()).optional(),
  foodOptions: z.record(z.union([z.boolean(), z.string()])).optional(),
  services: z.record(z.boolean()).optional(),
  experienceFeatures: z.record(z.boolean()).optional(),
  addOns: z.array(addOnSchema).optional(),
  bookingRules: z.record(z.string()).optional(),
});

export type RoomInput = z.infer<typeof roomSchema>;