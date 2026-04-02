import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import type { RoleName } from '../types';

export const authorize =
  (...allowedRoles: RoleName[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(AppError.unauthorized('Authentication required', 'UNAUTHENTICATED'));
      return;
    }
    if (!allowedRoles.includes(req.user.roleName)) {
      next(AppError.forbidden(
        `This action requires one of the following roles: ${allowedRoles.join(', ')}`,
        'FORBIDDEN',
      ));
      return;
    }
    next();
  };
