import express from 'express';
import type { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';

import { env } from './config/env';
import { requestLogger, notFound, errorHandler } from './middleware';
import apiRouter from './routes';

export const createApp = (): Express => {
  const app = express();

  app.use(helmet());

  const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`CORS: Origin '${origin}' is not allowed`));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(compression());
  app.use(requestLogger);

  if (env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  app.use(env.API_PREFIX, apiRouter);
  app.use(notFound);
  app.use(errorHandler);

  return app;
};
