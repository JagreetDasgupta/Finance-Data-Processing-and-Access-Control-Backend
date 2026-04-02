import type { Request, Response, NextFunction } from 'express';
import * as analyticsService from './analytics.service';
import { sendSuccess } from '../../utils/response';
import type { AnalyticsQuery, TrendsQuery, RecentQuery } from './analytics.validator';

export const analyticsController = {
  getSummary: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const summary = await analyticsService.getSummary(req.user!.id, req.user!.roleName, req.query as unknown as AnalyticsQuery);
      sendSuccess(res, summary, { message: 'Summary retrieved successfully' });
    } catch (err) { next(err); }
  },

  getBreakdown: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const breakdown = await analyticsService.getBreakdown(req.user!.id, req.user!.roleName, req.query as unknown as AnalyticsQuery);
      sendSuccess(res, breakdown, { message: 'Breakdown retrieved successfully' });
    } catch (err) { next(err); }
  },

  getTrends: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const trends = await analyticsService.getTrends(req.user!.id, req.user!.roleName, req.query as unknown as TrendsQuery);
      sendSuccess(res, trends, { message: 'Trends retrieved successfully' });
    } catch (err) { next(err); }
  },

  getRecent: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const records = await analyticsService.getRecentActivity(req.user!.id, req.user!.roleName, req.query as unknown as RecentQuery);
      sendSuccess(res, records, { message: 'Recent activity retrieved successfully' });
    } catch (err) { next(err); }
  },
};
