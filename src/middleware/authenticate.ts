import type { Request, Response, NextFunction } from 'express';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { verifyAccessToken } from '../utils/token';
import { AppError } from '../utils/AppError';
import type { AuthUser, RoleName } from '../types';

export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    next(AppError.unauthorized('Authentication token is required', 'MISSING_TOKEN'));
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id:       payload.sub,
      email:    payload.email,
      roleId:   payload.roleId,
      roleName: payload.roleName as RoleName,
    } satisfies AuthUser;
    next();
  } catch (err) {
    if (err instanceof TokenExpiredError) {
      next(AppError.unauthorized('Token has expired', 'TOKEN_EXPIRED'));
    } else if (err instanceof JsonWebTokenError) {
      next(AppError.unauthorized('Token is invalid', 'INVALID_TOKEN'));
    } else {
      next(err);
    }
  }
};
