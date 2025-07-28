import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
  phone_verified: z.boolean().default(false),
  membership_status: z.enum(['free', 'premium', 'enterprise']).default('free'),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

export type User = z.infer<typeof UserSchema>;