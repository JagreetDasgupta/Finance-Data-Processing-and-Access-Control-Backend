import morgan from 'morgan';
import { logger } from '../config/logger';
import { env } from '../config/env';

const morganFormat = env.NODE_ENV === 'production' ? 'combined' : 'dev';

export const requestLogger = morgan(morganFormat, {
  stream: { write: (message: string) => { logger.http(message.trimEnd()); } },
  skip: (req) => req.url === '/health' || req.url === `${env.API_PREFIX}/health`,
});
