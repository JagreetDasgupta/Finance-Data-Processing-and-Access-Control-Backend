import { z } from 'zod';

export const analyticsQuerySchema = z.object({
  query: z.object({
    from:     z.coerce.date().optional(),
    to:       z.coerce.date().optional(),
    type:     z.enum(['INCOME', 'EXPENSE'], { errorMap: () => ({ message: 'type must be INCOME or EXPENSE' }) }).optional(),
    category: z.string().trim().min(1).max(100).optional(),
  }),
});

export const trendsQuerySchema = z.object({
  query: z.object({
    from:   z.coerce.date().optional(),
    to:     z.coerce.date().optional(),
    period: z.enum(['month', 'week']).default('month'),
  }),
});

export const recentQuerySchema = z.object({
  query: z.object({
    limit: z.coerce.number().int().min(1).max(50).default(10),
  }),
});

export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>['query'];
export type TrendsQuery    = z.infer<typeof trendsQuerySchema>['query'];
export type RecentQuery    = z.infer<typeof recentQuerySchema>['query'];
