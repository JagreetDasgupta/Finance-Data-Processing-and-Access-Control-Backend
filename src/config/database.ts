import { PrismaClient } from '@prisma/client';
import { env } from './env';
import { logger } from './logger';

declare global {
  var __prisma: PrismaClient | undefined;
}

interface QueryEvent { query: string; params: string; duration: number; target: string; }
interface ErrorEvent { message: string; target: string; }
type PrismaWithEvents = {
  $on(event: 'query', cb: (e: QueryEvent) => void): void;
  $on(event: 'error', cb: (e: ErrorEvent) => void): void;
};

const createPrismaClient = (): PrismaClient =>
  new PrismaClient({
    log:
      env.NODE_ENV === 'development'
        ? [
            { emit: 'event', level: 'query' },
            { emit: 'event', level: 'error' },
            { emit: 'event', level: 'warn' },
          ]
        : [{ emit: 'event', level: 'error' }],
  });

export const prisma: PrismaClient =
  env.NODE_ENV === 'production'
    ? createPrismaClient()
    : (globalThis.__prisma ??= createPrismaClient());

const prismaEvents = prisma as unknown as PrismaWithEvents;

if (env.NODE_ENV === 'development') {
  prismaEvents.$on('query', (e) => {
    logger.debug(`Prisma [${e.duration}ms]: ${e.query}`);
  });
}

prismaEvents.$on('error', (e) => {
  logger.error('Prisma Error:', e.message);
});

export const connectDatabase = async (): Promise<void> => {
  await prisma.$connect();
  logger.info('Database connected');
};

export const disconnectDatabase = async (): Promise<void> => {
  await prisma.$disconnect();
  logger.info('Database disconnected');
};
