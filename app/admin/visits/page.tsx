import { listVisits } from '@/lib/server/leads.service';
import { isDbConfigured } from '@/lib/server/db';
import VisitsView from './VisitsView';
import DbError from '@/components/DbError';
import { logger } from '@/lib/server/logger';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Site Visits', robots: { index: false, follow: false } };

const iso = (d: Date) => d.toISOString().slice(0, 10);

export default async function VisitsPage() {
  if (!isDbConfigured()) {
    return (
      <main className="grid min-h-screen place-items-center bg-navy-50 px-6 text-center">
        <div className="max-w-md rounded-2xl bg-white p-8 shadow">
          <h1 className="text-lg font-bold text-navy">Database not connected</h1>
          <p className="mt-3 text-sm text-navy/60">
            Set <code className="rounded bg-navy-50 px-1.5 py-0.5 text-xs">MONGODB_URI</code> to schedule site visits.
          </p>
        </div>
      </main>
    );
  }

  // 60 days back catches anything overdue that was never closed out;
  // 90 days forward covers realistic scheduling.
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 60);
  const to = new Date(now);
  to.setDate(to.getDate() + 90);

  try {
    const visits = await listVisits(iso(from), iso(to));
    return <VisitsView visits={visits} today={iso(now)} />;
  } catch (err) {
    logger.error('admin.visits_page_failed', err);
    return <DbError detail={err instanceof Error ? err.message : String(err)} />;
  }
}
