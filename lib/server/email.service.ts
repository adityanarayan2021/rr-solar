import { site } from '../site';
import type { LeadInput } from '../lead-types';

const API = 'https://api.resend.com/emails';

const key = () => process.env.RESEND_API_KEY;
const fromAddress = () => process.env.MAIL_FROM ?? 'RR Solar Solutions <onboarding@resend.dev>';
const notifyTo = () => process.env.LEAD_NOTIFY_EMAIL ?? site.email;
const teamAlertsOn = () => process.env.NOTIFY_TEAM !== 'false';
const autoReplyOn = () => process.env.AUTO_REPLY !== 'false';

const esc = (s = '') => s.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c] as string);

async function send(payload: Record<string, unknown>): Promise<void> {
  const apiKey = key();
  if (!apiKey) throw new Error('RESEND_API_KEY not configured');
  const res = await fetch(API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: fromAddress(), ...payload }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

const row = (label: string, value?: string) =>
  value
    ? `<tr><td style="padding:8px 14px;color:#64748b;font-size:13px;white-space:nowrap">${label}</td><td style="padding:8px 14px;color:#0E2A5C;font-size:14px;font-weight:600">${esc(value)}</td></tr>`
    : '';

/** Internal alert so the team acts fast. Reply-to is the customer, not the server. */
export async function sendTeamAlert(lead: LeadInput & { source?: string }, leadId: string | null): Promise<void> {
  if (!teamAlertsOn()) return;
  const wa = `https://wa.me/91${lead.phone.replace(/\D/g, '').slice(-10)}`;
  const html = `
  <div style="font-family:Segoe UI,Arial,sans-serif;background:#f1f5f9;padding:28px">
    <div style="max-width:600px;margin:auto;background:#fff;border-radius:14px;overflow:hidden">
      <div style="background:#0E2A5C;padding:22px 26px">
        <div style="color:#F5911E;font-size:12px;letter-spacing:.14em;font-weight:700">NEW WEBSITE ENQUIRY</div>
        <div style="color:#fff;font-size:22px;font-weight:800;margin-top:6px">${esc(lead.name)}</div>
      </div>
      <table style="width:100%;border-collapse:collapse">
        ${row('Phone', lead.phone)}${row('Email', lead.email)}${row('City', lead.city)}
        ${row('Service', lead.service)}${row('Monthly bill', lead.bill)}${row('Message', lead.message)}
        ${row('Source', lead.source)}${row('Lead ID', leadId ?? 'not stored')}
      </table>
      <div style="padding:20px 26px 26px">
        <a href="tel:+91${esc(lead.phone)}" style="background:#F5911E;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:700;font-size:14px;display:inline-block">Call now</a>
        <a href="${wa}" style="background:#25D366;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:700;font-size:14px;display:inline-block;margin-left:8px">WhatsApp</a>
      </div>
    </div>
  </div>`;

  await send({
    to: [notifyTo()],
    reply_to: lead.email || undefined,
    subject: `New enquiry — ${lead.name} · ${lead.service ?? 'General'} · ${lead.phone}`,
    html,
  });
}

/** Confirmation to the customer so they know it went through. */
export async function sendCustomerAutoReply(lead: LeadInput): Promise<void> {
  if (!autoReplyOn() || !lead.email) return;
  const html = `
  <div style="font-family:Segoe UI,Arial,sans-serif;background:#f1f5f9;padding:28px">
    <div style="max-width:600px;margin:auto;background:#fff;border-radius:14px;overflow:hidden">
      <div style="background:#0E2A5C;padding:26px">
        <div style="color:#fff;font-size:20px;font-weight:800">R R <span style="color:#F5911E">SOLAR</span> SOLUTIONS</div>
        <div style="color:rgba(255,255,255,.6);font-size:11px;letter-spacing:.16em;margin-top:6px">COMPLETE SOLAR ENERGY PARTNER</div>
      </div>
      <div style="padding:28px;color:#334155;font-size:15px;line-height:1.65">
        <p style="margin:0 0 14px">Dear ${esc(lead.name)},</p>
        <p style="margin:0 0 14px">Thank you for contacting RR Solar Solutions. We have received your enquiry${lead.service ? ` regarding <strong style="color:#0E2A5C">${esc(lead.service)}</strong>` : ''} and our team will call you on <strong style="color:#0E2A5C">${esc(lead.phone)}</strong> within one working day.</p>
        <p style="margin:0 0 14px">What happens next:</p>
        <ol style="margin:0 0 18px;padding-left:20px">
          <li style="margin-bottom:6px">A free site survey at your convenience</li>
          <li style="margin-bottom:6px">System sizing and generation estimate</li>
          <li style="margin-bottom:6px">A written quotation with your PM Surya Ghar subsidy applied</li>
        </ol>
        <p style="margin:0 0 20px">If it's urgent, call us directly on <a href="tel:+91${site.phones[0]}" style="color:#F5911E;font-weight:700;text-decoration:none">+91 ${site.phones[0]}</a> or message us on WhatsApp.</p>
        <a href="https://wa.me/${site.whatsapp}" style="background:#25D366;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:700;font-size:14px;display:inline-block">Chat on WhatsApp</a>
      </div>
      <div style="background:#071634;padding:20px 28px;color:rgba(255,255,255,.6);font-size:12px;line-height:1.7">
        ${site.address.street}, ${site.address.city} – ${site.address.postalCode}, ${site.address.region}<br>
        +91 ${site.phones[0]} · +91 ${site.phones[1]} · ${site.email}
      </div>
    </div>
  </div>`;

  await send({
    to: [lead.email],
    reply_to: site.email,
    subject: 'We received your solar enquiry — RR Solar Solutions',
    html,
  });
}

/** Sends the quotation PDF to the customer as an attachment. */
export async function sendQuotationEmail(
  lead: { name: string; email?: string; phone: string; service?: string },
  pdf: Uint8Array,
  quoteNo: string,
): Promise<void> {
  if (!lead.email) throw new Error('This lead has no email address on file.');

  const html = `
  <div style="font-family:Segoe UI,Arial,sans-serif;background:#f1f5f9;padding:28px">
    <div style="max-width:600px;margin:auto;background:#fff;border-radius:14px;overflow:hidden">
      <div style="background:#0E2A5C;padding:26px">
        <div style="color:#fff;font-size:20px;font-weight:800">R R <span style="color:#F5911E">SOLAR</span> SOLUTIONS</div>
        <div style="color:rgba(255,255,255,.6);font-size:11px;letter-spacing:.16em;margin-top:6px">COMPLETE SOLAR ENERGY PARTNER</div>
      </div>
      <div style="padding:28px;color:#334155;font-size:15px;line-height:1.65">
        <p style="margin:0 0 14px">Dear ${esc(lead.name)},</p>
        <p style="margin:0 0 14px">Please find your solar quotation attached${lead.service ? ` for <strong style="color:#0E2A5C">${esc(lead.service)}</strong>` : ''}. Reference <strong style="color:#0E2A5C">${esc(quoteNo)}</strong>.</p>
        <p style="margin:0 0 14px">The quotation includes system sizing, pricing, the PM Surya Ghar subsidy you are eligible for, and an estimate of your generation and savings. It is valid for 15 days and subject to a final site survey.</p>
        <p style="margin:0 0 20px">Happy to walk you through it on a call — just reply to this email or ring us on <a href="tel:+91${site.phones[0]}" style="color:#F5911E;font-weight:700;text-decoration:none">+91 ${site.phones[0]}</a>.</p>
        <a href="https://wa.me/${site.whatsapp}" style="background:#25D366;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:700;font-size:14px;display:inline-block">Discuss on WhatsApp</a>
      </div>
      <div style="background:#071634;padding:20px 28px;color:rgba(255,255,255,.6);font-size:12px;line-height:1.7">
        ${site.address.street}, ${site.address.city} – ${site.address.postalCode}, ${site.address.region}<br>
        +91 ${site.phones[0]} · +91 ${site.phones[1]} · ${site.email}
      </div>
    </div>
  </div>`;

  await send({
    to: [lead.email],
    reply_to: site.email,
    subject: `Your solar quotation ${quoteNo} — RR Solar Solutions`,
    html,
    attachments: [
      {
        filename: `RR-Solar-Quotation-${quoteNo.replace(/\//g, '-')}.pdf`,
        content: Buffer.from(pdf).toString('base64'),
      },
    ],
  });
}

/** Monthly report digest with the Excel workbook attached. */
export async function sendMonthlyReportEmail(
  subject: string,
  html: string,
  xlsx: Uint8Array,
  filename: string,
): Promise<void> {
  await send({
    to: [notifyTo()],
    subject,
    html,
    attachments: [{ filename, content: Buffer.from(xlsx).toString('base64') }],
  });
}
