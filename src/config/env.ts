import { z } from 'zod';
import 'dotenv/config';

const envSchema = z.object({
  NODE_ENV:               z.enum(['development', 'production', 'test']).default('development'),
  PORT:                   z.coerce.number().int().positive().default(3000),
  API_PREFIX:             z.string().default('/api/v1'),
  DATABASE_URL:           z.string().url({ message: 'DATABASE_URL must be a valid connection string URL' }),
  JWT_SECRET:             z.string().min(16, { message: 'JWT_SECRET must be at least 16 characters' }),
  JWT_EXPIRES_IN:         z.string().default('7d'),
  JWT_REFRESH_SECRET:     z.string().min(16, { message: 'JWT_REFRESH_SECRET must be at least 16 characters' }),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  ALLOWED_ORIGINS:        z.string().default('http://localhost:3000'),
  LOG_LEVEL:              z.enum(['error', 'warn', 'info', 'http', 'debug']).default('info'),
});

const _parseResult = envSchema.safeParse(process.env);

if (!_parseResult.success) {
  console.error('Invalid environment variables:\n', JSON.stringify(_parseResult.error.format(), null, 2));
  process.exit(1);
}

export const env = _parseResult.data;
export type Env = typeof env;
