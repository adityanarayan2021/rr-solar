import { NextResponse } from 'next/server';
import { getLead, updateLead } from '@/lib/server/leads.service';
import { buildQuotationPdf, quotationNumber } from '@/lib/server/quotation.service';
import { sendQuotationEmail } from '@/lib/server/email.service';
import { requestLogger } from '@/lib/server/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Services that qualify for the residential PM Surya Ghar subsidy. */
const RESIDENTIAL = /rooftop|residential/i;

async function prepare(id: string, subsidyOverride: string | null) {
  const lead = await getLead(id);
  if (!lead) return { error: 'Lead not found.', status: 404 as const };
  if (!lead.systemKw || !lead.quoteAmount) {
    return {
      error: 'Add a system size (kW) and quote amount to this lead before generating a quotation.',
      status: 400 as const,
    };
  }
  const applySubsidy =
    subsidyOverride === null ? RESIDENTIAL.test(lead.service ?? '') : subsidyOverride !== 'false';

  const pdf = await buildQuotationPdf(lead, { applySubsidy });
  return { lead, pdf, quoteNo: quotationNumber(lead.id) };
}

/** Download the PDF. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const log = requestLogger(req, 'admin.quotation.download');
  const subsidy = new URL(req.url).searchParams.get('subsidy');
  try {
    const r = await prepare(id, subsidy);
    if ('error' in r) return NextResponse.json({ error: r.error }, { status: r.status });

    log.info('quotation.generated', { leadId: id, quoteNo: r.quoteNo, bytes: r.pdf.length });
    return new Response(r.pdf as unknown as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="RR-Solar-Quotation-${r.quoteNo.replace(/\//g, '-')}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    log.error('quotation.pdf_failed', err, { leadId: id });
    return NextResponse.json({ error: 'Could not generate the quotation.' }, { status: 500 });
  }
}

/** Email the PDF to the customer and advance the lead to "Quoted". */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const log = requestLogger(req, 'admin.quotation.email');
  const subsidy = new URL(req.url).searchParams.get('subsidy');
  try {
    const r = await prepare(id, subsidy);
    if ('error' in r) return NextResponse.json({ error: r.error }, { status: r.status });
    if (!r.lead.email) {
      return NextResponse.json({ error: 'This lead has no email address — download and send it manually.' }, { status: 400 });
    }

    await sendQuotationEmail(r.lead, r.pdf, r.quoteNo);
    log.info('quotation.emailed', { leadId: id, quoteNo: r.quoteNo, bytes: r.pdf.length });
    // Only advance the status once the email has actually gone out.
    await updateLead(id, { status: 'Quoted' });

    return NextResponse.json({ ok: true, message: `Quotation ${r.quoteNo} emailed to ${r.lead.email}.` });
  } catch (err) {
    log.error('quotation.email_failed', err, { leadId: id });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not email the quotation.' },
      { status: 502 },
    );
  }
}
