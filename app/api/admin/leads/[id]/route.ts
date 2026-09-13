import { NextResponse } from 'next/server';
import { updateLead } from '@/lib/server/leads.service';
import { LEAD_STATUSES, type LeadOps, type LeadStatus } from '@/lib/lead-types';
import { requestLogger } from '@/lib/server/logger';

export const runtime = 'nodejs';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const log = requestLogger(req, 'admin.leads.update');
  const body = (await req.json().catch(() => ({}))) as Partial<LeadOps>;

  if (body.status && !LEAD_STATUSES.includes(body.status as LeadStatus)) {
    return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });
  }

  try {
    const ok = await updateLead(id, body);
    if (!ok) {
      log.warn('lead.update_not_found', { leadId: id });
      return NextResponse.json({ error: 'Lead not found.' }, { status: 404 });
    }
    log.info('lead.updated', { leadId: id, fields: Object.keys(body).join(',') });
    return NextResponse.json({ ok: true });
  } catch (err) {
    log.error('lead.update_failed', err, { leadId: id });
    return NextResponse.json({ error: 'Could not update lead.' }, { status: 500 });
  }
}
