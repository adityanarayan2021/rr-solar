import { buildReport, monthRange } from '@/lib/server/reports.service';
import { buildMonthlyWorkbook } from '@/lib/server/export.service';
import { sendMonthlyReportEmail } from '@/lib/server/email.service';
import { inr } from '@/lib/lead-types';
import { requestLogger } from '@/lib/server/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Scheduled by vercel.json to run DAILY, but it only does work on the 1st of the
 * month. Vercel's Hobby plan restricts cron frequency, and a daily job that
 * self-checks the date works on every plan — a true monthly cron expression does
 * not. Add ?force=1 to run it manually for testing.
 */
export async function GET(req: Request) {
  const log = requestLogger(req, 'cron.monthly_report');
  const done = log.timer('cron.monthly_report_sent');
  const url = new URL(req.url);
  const secret = process.env.CRON_SECRET;

  // Vercel sends `Authorization: Bearer <CRON_SECRET>` when the env var is set.
  if (secret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      log.warn('cron.unauthorised');
      return Response.json({ error: 'Unauthorised' }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === 'production') {
    // Refuse to run unauthenticated in production rather than leaking data.
    return Response.json({ error: 'CRON_SECRET is not configured.' }, { status: 503 });
  }

  const now = new Date();
  const force = url.searchParams.get('force') === '1';
  if (now.getUTCDate() !== 1 && !force) {
    return Response.json({ skipped: true, reason: 'Only runs on the 1st of the month.' });
  }

  // Previous calendar month.
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth(); // 0-indexed "now" == 1-indexed previous month
  const range = m === 0 ? monthRange(y - 1, 12) : monthRange(y, m);

  try {
    const [report, workbook] = await Promise.all([buildReport(range), buildMonthlyWorkbook(range)]);
    const t = report.totals;

    const stat = (label: string, value: string, color = '#0E2A5C') => `
      <td style="padding:14px 10px;text-align:center;border:1px solid #e2e8f0">
        <div style="font-size:10px;letter-spacing:.08em;color:#64748b;text-transform:uppercase">${label}</div>
        <div style="font-size:20px;font-weight:800;color:${color};margin-top:6px">${value}</div>
      </td>`;

    const list = (title: string, rows: { key: string; count: number; won?: number }[]) => `
      <h3 style="margin:24px 0 8px;font-size:13px;color:#F5911E;text-transform:uppercase;letter-spacing:.08em">${title}</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        ${rows
          .slice(0, 6)
          .map(
            (r) => `<tr>
              <td style="padding:7px 0;color:#334155;border-bottom:1px solid #f1f5f9">${r.key}</td>
              <td style="padding:7px 0;text-align:right;font-weight:700;color:#0E2A5C;border-bottom:1px solid #f1f5f9">${r.count}${
                r.won !== undefined ? ` <span style="color:#2E9E4F;font-weight:600">(${r.won} won)</span>` : ''
              }</td>
            </tr>`,
          )
          .join('')}
      </table>`;

    const html = `
    <div style="font-family:Segoe UI,Arial,sans-serif;background:#f1f5f9;padding:28px">
      <div style="max-width:640px;margin:auto;background:#fff;border-radius:14px;overflow:hidden">
        <div style="background:#0E2A5C;padding:26px">
          <div style="color:#F5911E;font-size:11px;letter-spacing:.16em;font-weight:700">MONTHLY REPORT</div>
          <div style="color:#fff;font-size:24px;font-weight:800;margin-top:6px">${report.range.label}</div>
        </div>
        <div style="padding:26px">
          <table style="width:100%;border-collapse:collapse">
            <tr>
              ${stat('Enquiries', String(t.leads))}
              ${stat('Conversion', `${t.conversionRate}%`, '#2E9E4F')}
            </tr>
            <tr>
              ${stat('Closed value', inr(t.closedValue), '#2E9E4F')}
              ${stat('Open pipeline', inr(t.pipelineValue), '#F5911E')}
            </tr>
          </table>

          <p style="margin:20px 0 0;font-size:13px;color:#64748b;line-height:1.6">
            ${t.won} won · ${t.lost} lost · ${t.open} still open · ${t.totalKw} kW sold.
            Average deal value ${inr(t.avgDealValue)}.
          </p>

          ${list('Lead source', report.bySource)}
          ${list('Service mix', report.byService)}
          ${list('Top locations', report.byCity)}

          <p style="margin:26px 0 0;font-size:13px;color:#64748b">
            The full lead list is attached as an Excel workbook.
          </p>
        </div>
        <div style="background:#071634;padding:18px 26px;color:rgba(255,255,255,.55);font-size:11px">
          Generated automatically by the RR Solar Solutions website.
        </div>
      </div>
    </div>`;

    await sendMonthlyReportEmail(
      `RR Solar — ${report.range.label} report · ${t.leads} enquiries, ${t.won} won`,
      html,
      workbook.buffer,
      workbook.filename,
    );

    done({ month: report.range.label, leads: t.leads, won: t.won });
    return Response.json({ ok: true, month: report.range.label, leads: t.leads, won: t.won });
  } catch (err) {
    log.error('cron.monthly_report_failed', err);
    return Response.json({ error: 'Could not send the monthly report.' }, { status: 500 });
  }
}
