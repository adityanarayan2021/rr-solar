import { collection } from './leads.service';
import { isDbConfigured } from './db';
import { OPEN_STATUSES, type LeadStatus } from '../lead-types';

/**
 * All reporting aggregation lives here, computed by MongoDB rather than by
 * pulling documents into Node — so it stays fast as the collection grows.
 *
 * NestJS port: this becomes ReportsService, unchanged apart from the injected
 * collection.
 */

export type MonthKey = string; // 'YYYY-MM'

export type ReportRange = { from: Date; to: Date; label: string };

export type Report = {
  range: { from: string; to: string; label: string };
  totals: {
    leads: number;
    won: number;
    lost: number;
    open: number;
    conversionRate: number;   // won / (won + lost), as a percentage
    pipelineValue: number;    // ₹ quoted on leads still open
    closedValue: number;      // ₹ quoted on leads marked Won
    avgDealValue: number;
    totalKw: number;          // kW sold this period
  };
  byStatus: { key: LeadStatus; count: number }[];
  byService: { key: string; count: number; won: number; value: number }[];
  byCity: { key: string; count: number }[];
  bySource: { key: string; count: number; won: number }[];
  monthlyTrend: { month: MonthKey; leads: number; won: number; value: number }[];
};

export function monthRange(year: number, month1to12: number): ReportRange {
  const from = new Date(Date.UTC(year, month1to12 - 1, 1));
  const to = new Date(Date.UTC(year, month1to12, 1));
  return {
    from,
    to,
    label: from.toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
  };
}

const emptyReport = (range: ReportRange): Report => ({
  range: { from: range.from.toISOString(), to: range.to.toISOString(), label: range.label },
  totals: {
    leads: 0, won: 0, lost: 0, open: 0, conversionRate: 0,
    pipelineValue: 0, closedValue: 0, avgDealValue: 0, totalKw: 0,
  },
  byStatus: [], byService: [], byCity: [], bySource: [], monthlyTrend: [],
});

type GroupRow = { _id: string | null; count: number; won?: number; value?: number };

const clean = (rows: GroupRow[]) =>
  rows
    .map((r) => ({ key: r._id?.trim() || 'Not specified', count: r.count, won: r.won ?? 0, value: r.value ?? 0 }))
    .sort((a, b) => b.count - a.count);

export async function buildReport(range: ReportRange, trailingMonths = 12): Promise<Report> {
  if (!isDbConfigured()) return emptyReport(range);

  const col = await collection();
  const inRange = { createdAt: { $gte: range.from, $lt: range.to } };
  const wonExpr = { $cond: [{ $eq: ['$status', 'Won'] }, 1, 0] };
  const quote = { $ifNull: ['$quoteAmount', 0] };

  // Trailing window for the trend chart, ending at the selected period.
  const trendFrom = new Date(
    Date.UTC(range.to.getUTCFullYear(), range.to.getUTCMonth() - trailingMonths, 1),
  );

  const [totalsRows, statusRows, serviceRows, cityRows, sourceRows, trendRows] = await Promise.all([
    col.aggregate<{
      _id: null; leads: number; won: number; lost: number;
      closedValue: number; pipelineValue: number; totalKw: number;
    }>([
      { $match: inRange },
      {
        $group: {
          _id: null,
          leads: { $sum: 1 },
          won: { $sum: wonExpr },
          lost: { $sum: { $cond: [{ $eq: ['$status', 'Lost'] }, 1, 0] } },
          closedValue: { $sum: { $cond: [{ $eq: ['$status', 'Won'] }, quote, 0] } },
          pipelineValue: { $sum: { $cond: [{ $in: ['$status', OPEN_STATUSES] }, quote, 0] } },
          totalKw: { $sum: { $cond: [{ $eq: ['$status', 'Won'] }, { $ifNull: ['$systemKw', 0] }, 0] } },
        },
      },
    ]).toArray(),

    col.aggregate<GroupRow>([
      { $match: inRange },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]).toArray(),

    col.aggregate<GroupRow>([
      { $match: inRange },
      { $group: { _id: '$service', count: { $sum: 1 }, won: { $sum: wonExpr }, value: { $sum: quote } } },
    ]).toArray(),

    col.aggregate<GroupRow>([
      { $match: inRange },
      { $group: { _id: '$city', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]).toArray(),

    col.aggregate<GroupRow>([
      { $match: inRange },
      { $group: { _id: '$source', count: { $sum: 1 }, won: { $sum: wonExpr } } },
    ]).toArray(),

    col.aggregate<{ _id: { y: number; m: number }; count: number; won: number; value: number }>([
      { $match: { createdAt: { $gte: trendFrom, $lt: range.to } } },
      {
        $group: {
          _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } },
          count: { $sum: 1 },
          won: { $sum: wonExpr },
          value: { $sum: { $cond: [{ $eq: ['$status', 'Won'] }, quote, 0] } },
        },
      },
      { $sort: { '_id.y': 1, '_id.m': 1 } },
    ]).toArray(),
  ]);

  const t = totalsRows[0] ?? {
    leads: 0, won: 0, lost: 0, closedValue: 0, pipelineValue: 0, totalKw: 0,
  };
  const decided = t.won + t.lost;

  return {
    range: { from: range.from.toISOString(), to: range.to.toISOString(), label: range.label },
    totals: {
      leads: t.leads,
      won: t.won,
      lost: t.lost,
      open: t.leads - decided,
      // Measured against decided leads only. Counting leads still in the pipeline
      // as failures would understate performance early in a month.
      conversionRate: decided ? Math.round((t.won / decided) * 1000) / 10 : 0,
      pipelineValue: t.pipelineValue,
      closedValue: t.closedValue,
      avgDealValue: t.won ? Math.round(t.closedValue / t.won) : 0,
      totalKw: Math.round(t.totalKw * 100) / 100,
    },
    byStatus: clean(statusRows).map((r) => ({ key: r.key as LeadStatus, count: r.count })),
    byService: clean(serviceRows),
    byCity: clean(cityRows).map((r) => ({ key: r.key, count: r.count })),
    bySource: clean(sourceRows).map((r) => ({ key: r.key, count: r.count, won: r.won })),
    monthlyTrend: trendRows.map((r) => ({
      month: `${r._id.y}-${String(r._id.m).padStart(2, '0')}`,
      leads: r.count,
      won: r.won,
      value: r.value,
    })),
  };
}
