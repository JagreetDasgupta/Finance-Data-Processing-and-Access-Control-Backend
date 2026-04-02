import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    name:     z.string({ required_error: 'Name is required' }).trim().min(2, 'Name must be at least 2 characters').max(100, 'Name must be 100 characters or fewer'),
    email:    z.string({ required_error: 'Email is required' }).trim().toLowerCase().email('Must be a valid email address').max(255),
    password: z.string({ required_error: 'Password is required' }).min(8, 'Password must be at least 8 characters').max(72),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email:    z.string({ required_error: 'Email is required' }).trim().toLowerCase().email(),
    password: z.string({ required_error: 'Password is required' }).min(1),
  }),
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string({ required_error: 'Refresh token is required' }).min(1),
  }),
});

export type RegisterDto = z.infer<typeof registerSchema>['body'];
export type LoginDto   = z.infer<typeof loginSchema>['body'];
export type RefreshDto = z.infer<typeof refreshSchema>['body'];
