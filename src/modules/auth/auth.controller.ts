import type { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import { sendSuccess } from '../../utils/response';
import type { RegisterDto, LoginDto, RefreshDto } from './auth.validator';

export const authController = {
  register: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await authService.register(req.body as RegisterDto);
      sendSuccess(res, result, { message: 'Account created successfully', statusCode: 201 });
    } catch (err) { next(err); }
  },

  login: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tokens = await authService.login(req.body as LoginDto);
      sendSuccess(res, tokens, { message: 'Login successful' });
    } catch (err) { next(err); }
  },

  refresh: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { refreshToken } = req.body as RefreshDto;
      const result = await authService.refresh(refreshToken);
      sendSuccess(res, result, { message: 'Token refreshed' });
    } catch (err) { next(err); }
  },

  me: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const profile = await authService.getMe(req.user!.id);
      sendSuccess(res, profile);
    } catch (err) { next(err); }
  },
};
