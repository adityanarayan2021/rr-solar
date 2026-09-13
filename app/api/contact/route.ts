import { NextResponse } from 'next/server';
import { createLead } from '@/lib/server/leads.service';
import { sendCustomerAutoReply, sendTeamAlert } from '@/lib/server/email.service';
import { LEAD_SOURCES, type LeadInput, type LeadSource } from '@/lib/lead-types';
import { site } from '@/lib/site';
import { requestLogger } from '@/lib/server/logger';

export const runtime = 'nodejs';

const str = (v: unknown, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export async function POST(req: Request) {
  const log = requestLogger(req, 'contact');
  const done = log.timer('contact.completed');

  let raw: Record<string, unknown>;
  try {
    raw = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  // Honeypot: bots fill hidden fields, humans never see them.
  if (str(raw.company)) {
    log.warn('lead.honeypot_rejected');
    return NextResponse.json({ message: 'Thank you! Our team will call you shortly.' });
  }

  const lead: LeadInput = {
    name: str(raw.name, 120),
    phone: str(raw.phone, 20),
    email: str(raw.email, 160) || undefined,
    city: str(raw.city, 120) || undefined,
    service: str(raw.service, 160) || undefined,
    bill: str(raw.bill, 60) || undefined,
    message: str(raw.message, 2000) || undefined,
  };

  if (lead.name.length < 2) return NextResponse.json({ error: 'Please enter your name.' }, { status: 400 });
  if (!/^(\+?91[- ]?)?[6-9]\d{9}$/.test(lead.phone.replace(/[\s-]/g, '')))
    return NextResponse.json({ error: 'Please enter a valid 10-digit Indian mobile number.' }, { status: 400 });
  if (lead.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(lead.email))
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });

  // Attribution is client-reported, so never trust it blindly — validate against the enum.
  const claimed = str(raw.source, 30) as LeadSource;
  const source: LeadSource = LEAD_SOURCES.includes(claimed) ? claimed : 'Direct';

  // 1. Persist first — the database is the source of truth. If this fails we stop,
  //    because a lead we can't retrieve is a lead lost.
  let leadId: string | null = null;
  try {
    leadId = await createLead({
      ...lead,
      source,
      utmSource: str(raw.utmSource, 120) || undefined,
      utmMedium: str(raw.utmMedium, 120) || undefined,
      utmCampaign: str(raw.utmCampaign, 120) || undefined,
      referrer: str(raw.referrer, 400) || undefined,
      landingPage: str(raw.landingPage, 400) || undefined,
      userAgent: req.headers.get('user-agent') ?? undefined,
    });
  } catch (err) {
    log.error('lead.save_failed', err, { service: lead.service, city: lead.city });
    return NextResponse.json(
      { error: `Something went wrong. Please call us on +91 ${site.phones[0]}.` },
      { status: 500 },
    );
  }

  if (!leadId) log.warn('lead.not_persisted', { reason: 'MONGODB_URI not set', name: lead.name, phone: lead.phone });

  // 2. Notifications are best-effort. A failed email must never fail the request,
  //    because the lead is already safely stored.
  const results = await Promise.allSettled([
    sendTeamAlert({ ...lead, source }, leadId),
    sendCustomerAutoReply(lead),
  ]);
  results.forEach((r, i) => {
    if (r.status === 'rejected') log.error('lead.notify_failed', r.reason, { channel: i === 0 ? 'team_alert' : 'auto_reply' });
  });

  done({ leadId: leadId ?? 'not-stored', source, service: lead.service });
  return NextResponse.json({ message: 'Thank you! Our team will call you shortly.', id: leadId });
}
