import { NextResponse } from 'next/server';
import { listLeads } from '@/lib/server/leads.service';
import { requestLogger } from '@/lib/server/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const log = requestLogger(req, 'admin.leads.list');
  const done = log.timer('admin.leads.listed');
  const { searchParams } = new URL(req.url);
  try {
    const leads = await listLeads({
      status: searchParams.get('status') ?? undefined,
      q: searchParams.get('q') ?? undefined,
    });
    done({ count: leads.length });
    return NextResponse.json({ leads });
  } catch (err) {
    log.error('leads.list_failed', err);
    return NextResponse.json({ error: 'Could not load leads.' }, { status: 500 });
  }
}
