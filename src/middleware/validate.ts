import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';

export const validate =
  (schema: ZodSchema) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse({ body: req.body, params: req.params, query: req.query });

    if (!result.success) {
      next(result.error);
      return;
    }

    if (result.data.body   !== undefined) req.body   = result.data.body   as unknown;
    if (result.data.params !== undefined) req.params = result.data.params as Record<string, string>;
    if (result.data.query  !== undefined) req.query  = result.data.query  as Record<string, string>;

    next();
  };
