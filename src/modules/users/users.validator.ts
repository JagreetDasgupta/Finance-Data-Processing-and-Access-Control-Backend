import { z } from 'zod';

const nameField     = z.string({ required_error: 'Name is required' }).trim().min(2, 'Name must be at least 2 characters').max(100, 'Name must be 100 characters or fewer');
const emailField    = z.string({ required_error: 'Email is required' }).trim().toLowerCase().email('Must be a valid email address').max(255, 'Email must be 255 characters or fewer');
const passwordField = z.string({ required_error: 'Password is required' }).min(8, 'Password must be at least 8 characters').max(72, 'Password must be 72 characters or fewer');
const roleIdField   = z.string().cuid({ message: 'roleId must be a valid ID' });
const statusField   = z.enum(['ACTIVE', 'INACTIVE'], { errorMap: () => ({ message: 'status must be ACTIVE or INACTIVE' }) });

export const createUserSchema = z.object({
  body: z.object({ name: nameField, email: emailField, password: passwordField, roleId: roleIdField }),
});

export const updateUserSchema = z.object({
  body: z.object({ name: nameField.optional(), roleId: roleIdField.optional(), status: statusField.optional() })
    .refine((data) => Object.values(data as Record<string, unknown>).some((v) => v !== undefined), { message: 'At least one field must be provided to update' }),
  params: z.object({ id: z.string().cuid({ message: 'User ID must be a valid cuid' }) }),
});

export const listUsersQuerySchema = z.object({
  query: z.object({
    page:   z.coerce.number().int().positive().default(1),
    limit:  z.coerce.number().int().min(1).max(100).default(20),
    status: statusField.optional(),
    roleId: roleIdField.optional(),
  }),
});

export const userIdParamSchema = z.object({ params: z.object({ id: z.string().cuid({ message: 'User ID must be a valid cuid' }) }) });

export type CreateUserDto  = z.infer<typeof createUserSchema>['body'];
export type UpdateUserDto  = z.infer<typeof updateUserSchema>['body'];
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>['query'];
