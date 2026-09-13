import { buildReport, monthRange } from '@/lib/server/reports.service';
import { isDbConfigured } from '@/lib/server/db';
import ReportsView from './ReportsView';
import DbError from '@/components/DbError';
import { logger } from '@/lib/server/logger';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Reports', robots: { index: false, follow: false } };

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const { m } = await searchParams;
  const now = new Date();

  // ?m=YYYY-MM selects a month; default is the current one.
  const [y, mo] = (m ?? '').split('-').map(Number);
  const valid = Number.isInteger(y) && Number.isInteger(mo) && mo >= 1 && mo <= 12;
  const range = valid ? monthRange(y, mo) : monthRange(now.getUTCFullYear(), now.getUTCMonth() + 1);
  const selected = valid
    ? `${y}-${String(mo).padStart(2, '0')}`
    : `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

  if (!isDbConfigured()) {
    return (
      <main className="grid min-h-screen place-items-center bg-navy-50 px-6 text-center">
        <div className="max-w-md rounded-2xl bg-white p-8 shadow">
          <h1 className="text-lg font-bold text-navy">Database not connected</h1>
          <p className="mt-3 text-sm text-navy/60">
            Set <code className="rounded bg-navy-50 px-1.5 py-0.5 text-xs">MONGODB_URI</code> to generate reports.
          </p>
        </div>
      </main>
    );
  }

  try {
    const report = await buildReport(range);
    return <ReportsView report={report} selected={selected} />;
  } catch (err) {
    logger.error('admin.reports_page_failed', err);
    return <DbError detail={err instanceof Error ? err.message : String(err)} />;
  }
}
