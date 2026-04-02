import { Router } from 'express';
import type { Request, Response } from 'express';
import { env } from '../config/env';
import { sendSuccess } from '../utils/response';

import authRoutes      from '../modules/auth/auth.routes';
import usersRoutes     from '../modules/users/users.routes';
import recordsRoutes   from '../modules/records/records.routes';
import analyticsRoutes from '../modules/analytics/analytics.routes';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  sendSuccess(res, {
    status:      'ok',
    timestamp:   new Date().toISOString(),
    environment: env.NODE_ENV,
    version:     process.env['npm_package_version'] ?? '0.1.0',
  });
});

router.use('/auth',      authRoutes);
router.use('/users',     usersRoutes);
router.use('/records',   recordsRoutes);
router.use('/analytics', analyticsRoutes);

export default router;
