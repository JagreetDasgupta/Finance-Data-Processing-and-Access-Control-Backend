import { prisma } from '../../config/database';
import { AppError } from '../../utils/AppError';
import { cache } from '../../utils/cache';
import type { FinancialRecordDto, PaginatedResult, RecordType } from '../../types';
import type { CreateRecordDto, UpdateRecordDto, ListRecordsQuery } from './records.validator';
import type { Prisma } from '@prisma/client';

const RECORD_SELECT = {
  id:        true,
  amount:    true,
  type:      true,
  category:  true,
  date:      true,
  notes:     true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
} as const;

type RecordRow = {
  id:        string;
  amount:    { toString(): string };
  type:      'INCOME' | 'EXPENSE';
  category:  string;
  date:      Date;
  notes:     string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

const toRecordDto = (row: RecordRow): FinancialRecordDto => ({
  id:        row.id,
  amount:    row.amount.toString(),
  type:      row.type as RecordType,
  category:  row.category,
  date:      row.date.toISOString().slice(0, 10),
  notes:     row.notes,
  createdBy: row.createdBy,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const ownershipFilter = (
  actorId:   string,
  actorRole: string,
): Prisma.FinancialRecordWhereInput =>
  actorRole === 'admin' ? {} : { createdBy: actorId };

export const buildRecordWhere = (
  actorId:   string,
  actorRole: string,
  query: Pick<ListRecordsQuery, 'type' | 'category' | 'from' | 'to'>,
): Prisma.FinancialRecordWhereInput => {
  const where: Prisma.FinancialRecordWhereInput = {
    ...ownershipFilter(actorId, actorRole),
  };

  if (query.type)     where.type     = query.type;
  if (query.category) where.category = { equals: query.category, mode: 'insensitive' };

  if (query.from || query.to) {
    where.date = {
      ...(query.from ? { gte: query.from } : {}),
      ...(query.to   ? { lte: query.to }   : {}),
    };
  }

  return where;
};

const invalidateAnalyticsCache = (actorId: string): void => {
  cache.invalidatePrefix(`summary:${actorId}`);
  cache.invalidatePrefix(`breakdown:${actorId}`);
  cache.invalidatePrefix(`trends:${actorId}`);
  cache.invalidatePrefix(`recent:${actorId}`);
};

export const createRecord = async (
  actorId: string,
  dto: CreateRecordDto,
): Promise<FinancialRecordDto> => {
  const record = await prisma.financialRecord.create({
    data: {
      amount:    dto.amount,
      type:      dto.type,
      category:  dto.category,
      notes:     dto.notes ?? null,
      date:      dto.date,
      createdBy: actorId,
    },
    select: RECORD_SELECT,
  });

  invalidateAnalyticsCache(actorId);
  return toRecordDto(record);
};

export const listRecords = async (
  actorId:   string,
  actorRole: string,
  query:     ListRecordsQuery,
): Promise<PaginatedResult<FinancialRecordDto>> => {
  const { page, limit, sortBy, sortOrder } = query;
  const skip  = (page - 1) * limit;
  const where = buildRecordWhere(actorId, actorRole, query);

  const orderBy: Prisma.FinancialRecordOrderByWithRelationInput =
    sortBy === 'amount'    ? { amount:    sortOrder } :
    sortBy === 'createdAt' ? { createdAt: sortOrder } :
                             { date:      sortOrder };

  const [records, total] = await prisma.$transaction([
    prisma.financialRecord.findMany({ where, select: RECORD_SELECT, orderBy, skip, take: limit }),
    prisma.financialRecord.count({ where }),
  ]);

  return {
    items:      records.map(toRecordDto),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

export const getRecordById = async (
  actorId:   string,
  actorRole: string,
  recordId:  string,
): Promise<FinancialRecordDto> => {
  const where: Prisma.FinancialRecordWhereInput = {
    id: recordId,
    ...ownershipFilter(actorId, actorRole),
  };

  const record = await prisma.financialRecord.findFirst({ where, select: RECORD_SELECT });

  if (!record) {
    throw AppError.notFound(`Record with id '${recordId}' not found`, 'RECORD_NOT_FOUND');
  }

  return toRecordDto(record);
};

export const updateRecord = async (
  actorId:   string,
  actorRole: string,
  recordId:  string,
  dto:       UpdateRecordDto,
): Promise<FinancialRecordDto> => {
  await getRecordById(actorId, actorRole, recordId);

  const updated = await prisma.financialRecord.update({
    where: { id: recordId },
    data: {
      ...(dto.amount   !== undefined ? { amount:   dto.amount }   : {}),
      ...(dto.type     !== undefined ? { type:     dto.type }     : {}),
      ...(dto.category !== undefined ? { category: dto.category } : {}),
      ...('notes' in dto             ? { notes:    dto.notes }    : {}),
      ...(dto.date     !== undefined ? { date:     dto.date }     : {}),
    },
    select: RECORD_SELECT,
  });

  invalidateAnalyticsCache(actorId);
  return toRecordDto(updated);
};

export const deleteRecord = async (
  actorId:   string,
  actorRole: string,
  recordId:  string,
): Promise<void> => {
  await getRecordById(actorId, actorRole, recordId);
  await prisma.financialRecord.delete({ where: { id: recordId } });
  invalidateAnalyticsCache(actorId);
};
