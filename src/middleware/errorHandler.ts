import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { AppError } from '../utils/AppError';
import { sendError } from '../utils/response';
import { logger } from '../config/logger';
import { env } from '../config/env';

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (err instanceof AppError) {
    if (!err.isOperational) logger.error('Programmer error:', err);
    sendError(res, { message: err.message, statusCode: err.statusCode, code: err.code });
    return;
  }

  if (err instanceof ZodError) {
    sendError(res, { message: 'Validation failed', statusCode: 422, code: 'VALIDATION_ERROR', errors: err.flatten().fieldErrors });
    return;
  }

  if (err instanceof TokenExpiredError) {
    sendError(res, { message: 'Token has expired', statusCode: 401, code: 'TOKEN_EXPIRED' });
    return;
  }

  if (err instanceof JsonWebTokenError) {
    sendError(res, { message: 'Token is invalid', statusCode: 401, code: 'INVALID_TOKEN' });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    logger.warn(`Prisma [${err.code}]:`, err.message);
    switch (err.code) {
      case 'P2002':
        sendError(res, { message: 'A record with this value already exists', statusCode: 409, code: 'CONFLICT' });
        return;
      case 'P2025':
        sendError(res, { message: 'Record not found', statusCode: 404, code: 'NOT_FOUND' });
        return;
      case 'P2003':
        sendError(res, { message: 'Related resource not found', statusCode: 422, code: 'FOREIGN_KEY_VIOLATION' });
        return;
      default:
        sendError(res, { message: 'Database operation failed', statusCode: 500, code: 'DATABASE_ERROR' });
        return;
    }
  }

  logger.error('Unhandled error:', err);
  sendError(res, {
    message: env.NODE_ENV === 'production' ? 'Internal server error' : String(err),
    statusCode: 500,
    code: 'INTERNAL_ERROR',
  });
};
