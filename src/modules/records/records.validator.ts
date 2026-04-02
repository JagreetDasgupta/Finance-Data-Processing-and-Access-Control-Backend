import { z } from 'zod';

const typeField   = z.enum(['INCOME', 'EXPENSE'], { errorMap: () => ({ message: 'Type must be INCOME or EXPENSE' }) });
const amountField = z.number({ invalid_type_error: 'Amount must be a number' }).positive({ message: 'Amount must be greater than zero' }).multipleOf(0.01, { message: 'Amount must have at most 2 decimal places' });
const notesField  = z.string().trim().max(500, 'Notes must be 500 characters or fewer').nullish().transform((v) => v ?? null);
const dateField   = z.coerce.date({ invalid_type_error: 'Date must be a valid date string (e.g. 2024-03-15)' }).refine((d) => d <= new Date(), { message: 'Date cannot be in the future' });

export const createRecordSchema = z.object({
  body: z.object({
    amount:   amountField,
    type:     typeField,
    category: z.string({ required_error: 'Category is required' }).trim().min(1, 'Category cannot be empty').max(100, 'Category must be 100 characters or fewer'),
    notes:    notesField,
    date:     dateField,
  }),
});

export const updateRecordSchema = z.object({
  body: z.object({ amount: amountField.optional(), type: typeField.optional(), category: z.string().trim().min(1).max(100).optional(), notes: notesField, date: dateField.optional() })
    .refine((data) => Object.values(data as Record<string, unknown>).some((v) => v !== undefined), { message: 'At least one field must be provided to update' }),
  params: z.object({ id: z.string().cuid({ message: 'Invalid record ID' }) }),
});

export const listRecordsQuerySchema = z.object({
  query: z.object({
    page:      z.coerce.number().int().positive().default(1),
    limit:     z.coerce.number().int().min(1).max(100).default(20),
    type:      typeField.optional(),
    category:  z.string().trim().min(1).max(100).optional(),
    from:      z.coerce.date().optional(),
    to:        z.coerce.date().optional(),
    sortBy:    z.enum(['date', 'amount', 'createdAt']).default('date'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
});

export const recordIdParamSchema = z.object({ params: z.object({ id: z.string().cuid({ message: 'Invalid record ID' }) }) });

export type CreateRecordDto  = z.infer<typeof createRecordSchema>['body'];
export type UpdateRecordDto  = z.infer<typeof updateRecordSchema>['body'];
export type ListRecordsQuery = z.infer<typeof listRecordsQuerySchema>['query'];
