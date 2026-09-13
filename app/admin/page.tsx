import { listLeads, statusCounts } from '@/lib/server/leads.service';
import { isDbConfigured } from '@/lib/server/db';
import LeadsTable from './LeadsTable';
import DbError from '@/components/DbError';
import { logger } from '@/lib/server/logger';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Leads', robots: { index: false, follow: false } };

export default async function AdminPage() {
  if (!isDbConfigured()) {
    return (
      <main className="grid min-h-screen place-items-center bg-navy-50 px-6 text-center">
        <div className="max-w-md rounded-2xl bg-white p-8 shadow">
          <h1 className="text-lg font-bold text-navy">Database not connected</h1>
          <p className="mt-3 text-sm text-navy/60">
            Set <code className="rounded bg-navy-50 px-1.5 py-0.5 text-xs">MONGODB_URI</code> in your environment
            variables to start storing and viewing leads.
          </p>
        </div>
      </main>
    );
  }

  try {
    const [leads, counts] = await Promise.all([listLeads(), statusCounts()]);
    return <LeadsTable initialLeads={leads} counts={counts} />;
  } catch (err) {
    logger.error('admin.leads_page_failed', err);
    return <DbError detail={err instanceof Error ? err.message : String(err)} />;
  }
}
