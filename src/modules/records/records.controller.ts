import type { Request, Response, NextFunction } from 'express';
import * as recordsService from './records.service';
import { sendSuccess } from '../../utils/response';
import type { CreateRecordDto, UpdateRecordDto, ListRecordsQuery } from './records.validator';

export const recordsController = {
  create: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const record = await recordsService.createRecord(req.user!.id, req.body as CreateRecordDto);
      sendSuccess(res, record, { message: 'Record created successfully', statusCode: 201 });
    } catch (err) { next(err); }
  },

  list: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await recordsService.listRecords(req.user!.id, req.user!.roleName, req.query as unknown as ListRecordsQuery);
      sendSuccess(res, result.items, { message: 'Records retrieved successfully', meta: { page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages } });
    } catch (err) { next(err); }
  },

  getById: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const record = await recordsService.getRecordById(req.user!.id, req.user!.roleName, req.params['id'] as string);
      sendSuccess(res, record);
    } catch (err) { next(err); }
  },

  update: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const record = await recordsService.updateRecord(req.user!.id, req.user!.roleName, req.params['id'] as string, req.body as UpdateRecordDto);
      sendSuccess(res, record, { message: 'Record updated successfully' });
    } catch (err) { next(err); }
  },

  remove: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await recordsService.deleteRecord(req.user!.id, req.user!.roleName, req.params['id'] as string);
      sendSuccess(res, null, { message: 'Record deleted successfully' });
    } catch (err) { next(err); }
  },
};
