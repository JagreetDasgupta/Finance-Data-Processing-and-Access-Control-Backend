import { Router } from 'express';
import { analyticsController } from './analytics.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { analyticsQuerySchema, trendsQuerySchema, recentQuerySchema } from './analytics.validator';

const router = Router();
router.use(authenticate);

router.get('/summary',   authorize('viewer', 'analyst', 'admin'), validate(analyticsQuerySchema), analyticsController.getSummary);
router.get('/breakdown', authorize('viewer', 'analyst', 'admin'), validate(analyticsQuerySchema), analyticsController.getBreakdown);
router.get('/trends',    authorize('viewer', 'analyst', 'admin'), validate(trendsQuerySchema),    analyticsController.getTrends);
router.get('/recent',    authorize('viewer', 'analyst', 'admin'), validate(recentQuerySchema),    analyticsController.getRecent);

export default router;
