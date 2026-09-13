import { monthRange } from '@/lib/server/reports.service';
import { buildMonthlyWorkbook } from '@/lib/server/export.service';
import { requestLogger } from '@/lib/server/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const log = requestLogger(req, 'admin.report.export');
  const done = log.timer('report.exported');
  const { searchParams } = new URL(req.url);
  const now = new Date();
  const [y, m] = (searchParams.get('m') ?? '').split('-').map(Number);
  const valid = Number.isInteger(y) && Number.isInteger(m) && m >= 1 && m <= 12;
  const range = valid ? monthRange(y, m) : monthRange(now.getUTCFullYear(), now.getUTCMonth() + 1);

  try {
    const { buffer, filename } = await buildMonthlyWorkbook(range);
    done({ filename, bytes: buffer.length });
    return new Response(buffer as unknown as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    log.error('report.export_failed', err);
    return Response.json({ error: 'Could not generate the report.' }, { status: 500 });
  }
}
