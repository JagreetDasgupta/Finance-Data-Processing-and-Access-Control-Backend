import { prisma } from '../../config/database';
import { buildRecordWhere } from '../records/records.service';
import { cache, buildCacheKey, TTL } from '../../utils/cache';
import type { AnalyticsQuery, TrendsQuery, RecentQuery } from './analytics.validator';
import type { FinancialRecordDto, RecordType, CategoryTotal, DashboardSummary } from '../../types';

const decimalToString = (value: { toString(): string } | null): string =>
  value ? value.toString() : '0.00';

const resolveWindow = (from?: Date, to?: Date): { from: Date; to: Date } => {
  const now = new Date();
  return {
    from: from ?? new Date(now.getFullYear(), now.getMonth(), 1),
    to: to ?? new Date(now.getFullYear(), now.getMonth() + 1, 0),
  };
};

export const getSummary = async (
  actorId: string,
  actorRole: string,
  query: AnalyticsQuery,
): Promise<DashboardSummary> => {
  const key = buildCacheKey('summary', actorId, actorRole, query.from?.toISOString(), query.to?.toISOString(), query.type, query.category);
  const hit = cache.get<DashboardSummary>(key);
  if (hit) return hit;

  const window = resolveWindow(query.from, query.to);

  const incomeWhere  = buildRecordWhere(actorId, actorRole, { ...query, from: window.from, to: window.to, type: 'INCOME' });
  const expenseWhere = buildRecordWhere(actorId, actorRole, { ...query, from: window.from, to: window.to, type: 'EXPENSE' });
  const totalWhere   = buildRecordWhere(actorId, actorRole, { ...query, from: window.from, to: window.to });

  const [incomeAgg, expenseAgg, count] = await prisma.$transaction([
    prisma.financialRecord.aggregate({ where: incomeWhere, _sum: { amount: true } }),
    prisma.financialRecord.aggregate({ where: expenseWhere, _sum: { amount: true } }),
    prisma.financialRecord.count({ where: totalWhere }),
  ]);

  const totalIncome = decimalToString(incomeAgg._sum.amount);
  const totalExpenses = decimalToString(expenseAgg._sum.amount);
  const balance = (parseFloat(totalIncome) - parseFloat(totalExpenses)).toFixed(2);

  const result: DashboardSummary = {
    totalIncome,
    totalExpenses,
    balance,
    recordCount: count,
    period: {
      from: window.from.toISOString().slice(0, 10),
      to: window.to.toISOString().slice(0, 10),
    },
  };

  cache.set(key, result, TTL.SUMMARY);
  return result;
};

export const getBreakdown = async (
  actorId: string,
  actorRole: string,
  query: AnalyticsQuery,
): Promise<CategoryTotal[]> => {
  const key = buildCacheKey('breakdown', actorId, actorRole, query.from?.toISOString(), query.to?.toISOString(), query.type, query.category);
  const hit = cache.get<CategoryTotal[]>(key);
  if (hit) return hit;

  const window = resolveWindow(query.from, query.to);
  const where = buildRecordWhere(actorId, actorRole, { ...query, from: window.from, to: window.to });

  const groups = await prisma.financialRecord.groupBy({
    by: ['category', 'type'],
    where,
    _sum: { amount: true },
    _count: { id: true },
    orderBy: { _sum: { amount: 'desc' } },
  });

  const result: CategoryTotal[] = groups.map((g) => ({
    category: g.category,
    type: g.type as RecordType,
    total: decimalToString(g._sum.amount),
    count: g._count.id,
  }));

  cache.set(key, result, TTL.BREAKDOWN);
  return result;
};

export interface TrendBucket {
  bucket: string;
  income: string;
  expense: string;
}

export const getTrends = async (
  actorId: string,
  actorRole: string,
  query: TrendsQuery,
): Promise<TrendBucket[]> => {
  const key = buildCacheKey('trends', actorId, actorRole, query.period, query.from?.toISOString(), query.to?.toISOString());
  const hit = cache.get<TrendBucket[]>(key);
  if (hit) return hit;

  const now = new Date();
  const defaultFrom =
    query.period === 'week'
      ? new Date(now.getTime() - 7 * 8 * 24 * 60 * 60 * 1000)
      : new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const from = query.from ?? defaultFrom;
  const to = query.to ?? now;

  const bucketExpr =
    query.period === 'week'
      ? `TO_CHAR(date, 'IYYY-"W"IW')`
      : `TO_CHAR(date, 'YYYY-MM')`;

  const ownerClause =
    actorRole === 'admin' ? '' : `AND created_by = '${actorId}'`;

  type RawRow = { bucket: string; type: string; total: string };

  const rows = await prisma.$queryRawUnsafe<RawRow[]>(`
    SELECT
      ${bucketExpr}   AS bucket,
      type,
      SUM(amount)::TEXT AS total
    FROM financial_records
    WHERE date >= '${from.toISOString().slice(0, 10)}'
      AND date <= '${to.toISOString().slice(0, 10)}'
      ${ownerClause}
    GROUP BY bucket, type
    ORDER BY bucket ASC, type ASC
  `);

  const bucketMap = new Map<string, TrendBucket>();
  for (const row of rows) {
    if (!bucketMap.has(row.bucket)) {
      bucketMap.set(row.bucket, { bucket: row.bucket, income: '0.00', expense: '0.00' });
    }
    const entry = bucketMap.get(row.bucket)!;
    if (row.type === 'INCOME') entry.income = parseFloat(row.total).toFixed(2);
    if (row.type === 'EXPENSE') entry.expense = parseFloat(row.total).toFixed(2);
  }

  const result = Array.from(bucketMap.values());
  cache.set(key, result, TTL.TRENDS);
  return result;
};

export const getRecentActivity = async (
  actorId: string,
  actorRole: string,
  query: RecentQuery,
): Promise<FinancialRecordDto[]> => {
  const key = buildCacheKey('recent', actorId, actorRole, query.limit);
  const hit = cache.get<FinancialRecordDto[]>(key);
  if (hit) return hit;

  const where = buildRecordWhere(actorId, actorRole, {});

  const records = await prisma.financialRecord.findMany({
    where,
    select: {
      id: true, amount: true, type: true, category: true,
      date: true, notes: true, createdBy: true, createdAt: true, updatedAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: query.limit,
  });

  const result: FinancialRecordDto[] = records.map((r) => ({
    id: r.id,
    amount: r.amount.toString(),
    type: r.type as RecordType,
    category: r.category,
    date: r.date.toISOString().slice(0, 10),
    notes: r.notes,
    createdBy: r.createdBy,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));

  cache.set(key, result, TTL.RECENT);
  return result;
};
