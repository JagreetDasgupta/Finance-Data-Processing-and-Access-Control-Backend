import type { Request, Response, NextFunction } from 'express';
import * as usersService from './users.service';
import { sendSuccess } from '../../utils/response';
import type { CreateUserDto, UpdateUserDto, ListUsersQuery } from './users.validator';

export const usersController = {
  create: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await usersService.createUser(req.body as CreateUserDto);
      sendSuccess(res, user, { message: 'User created successfully', statusCode: 201 });
    } catch (err) { next(err); }
  },

  list: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query  = req.query as unknown as ListUsersQuery;
      const result = await usersService.listUsers(query);
      sendSuccess(res, result.items, { message: 'Users retrieved successfully', meta: { page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages } });
    } catch (err) { next(err); }
  },

  getById: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await usersService.getUserById(req.params['id'] as string);
      sendSuccess(res, user);
    } catch (err) { next(err); }
  },

  update: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await usersService.updateUser(req.params['id'] as string, req.body as UpdateUserDto);
      sendSuccess(res, user, { message: 'User updated successfully' });
    } catch (err) { next(err); }
  },

  remove: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await usersService.deleteUser(req.params['id'] as string);
      sendSuccess(res, null, { message: 'User deleted successfully' });
    } catch (err) { next(err); }
  },

  listRoles: async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const roles = await usersService.listRoles();
      sendSuccess(res, roles, { message: 'Roles retrieved successfully' });
    } catch (err) { next(err); }
  },
};
