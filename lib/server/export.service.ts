import ExcelJS from 'exceljs';
import { buildReport, type ReportRange } from './reports.service';
import { listLeadsBetween } from './leads.service';
import { inr } from '../lead-types';

const NAVY = 'FF0E2A5C';
const SOLAR = 'FFF5911E';

function headerRow(sheet: ExcelJS.Worksheet, rowIndex: number) {
  const row = sheet.getRow(rowIndex);
  row.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  row.alignment = { vertical: 'middle' };
  row.height = 22;
}

/** Builds the monthly workbook. Shared by the download endpoint and the cron email. */
export async function buildMonthlyWorkbook(range: ReportRange): Promise<{ buffer: Buffer; filename: string; label: string }> {
  const [report, leads] = await Promise.all([buildReport(range), listLeadsBetween(range.from, range.to)]);

  const wb = new ExcelJS.Workbook();
  wb.creator = 'RR Solar Solutions';
  wb.created = new Date();

  // ---------- Sheet 1: Summary ----------
  const s = wb.addWorksheet('Summary', { views: [{ showGridLines: false }] });
  s.columns = [{ width: 34 }, { width: 22 }];

  s.mergeCells('A1:B1');
  const title = s.getCell('A1');
  title.value = 'RR SOLAR SOLUTIONS — Monthly Report';
  title.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  title.alignment = { vertical: 'middle', horizontal: 'center' };
  s.getRow(1).height = 34;

  s.mergeCells('A2:B2');
  const sub = s.getCell('A2');
  sub.value = report.range.label;
  sub.font = { bold: true, size: 12, color: { argb: NAVY } };
  sub.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDF0DE' } };
  sub.alignment = { horizontal: 'center' };
  s.getRow(2).height = 22;

  const t = report.totals;
  const rows: [string, string | number][] = [
    ['Total enquiries', t.leads],
    ['Won', t.won],
    ['Lost', t.lost],
    ['Still open', t.open],
    ['Conversion rate', `${t.conversionRate}%`],
    ['Closed value', inr(t.closedValue)],
    ['Open pipeline', inr(t.pipelineValue)],
    ['Average deal value', inr(t.avgDealValue)],
    ['Capacity sold (kW)', t.totalKw],
  ];
  s.addRow([]);
  rows.forEach(([k, v]) => {
    const r = s.addRow([k, v]);
    r.getCell(1).font = { color: { argb: 'FF64748B' } };
    r.getCell(2).font = { bold: true, color: { argb: NAVY } };
    r.getCell(2).alignment = { horizontal: 'right' };
  });

  const section = (heading: string, cols: string[], data: (string | number)[][]) => {
    s.addRow([]);
    const h = s.addRow([heading]);
    h.getCell(1).font = { bold: true, size: 12, color: { argb: SOLAR } };
    const c = s.addRow(cols);
    headerRow(s, c.number);
    data.forEach((d) => s.addRow(d));
  };

  section('Lead source', ['Source', 'Leads / Won'], report.bySource.map((r) => [r.key, `${r.count} / ${r.won}`]));
  section('Service mix', ['Service', 'Leads / Won'], report.byService.map((r) => [r.key, `${r.count} / ${r.won}`]));
  section('Top locations', ['City', 'Leads'], report.byCity.map((r) => [r.key, r.count]));
  section('12-month trend', ['Month', 'Leads / Won'], report.monthlyTrend.map((r) => [r.month, `${r.leads} / ${r.won}`]));

  // ---------- Sheet 2: Lead detail ----------
  const d = wb.addWorksheet('Leads', { views: [{ state: 'frozen', ySplit: 1, showGridLines: false }] });
  d.columns = [
    { header: 'Date', key: 'date', width: 18 },
    { header: 'Name', key: 'name', width: 24 },
    { header: 'Phone', key: 'phone', width: 16 },
    { header: 'Email', key: 'email', width: 28 },
    { header: 'City', key: 'city', width: 18 },
    { header: 'Service', key: 'service', width: 30 },
    { header: 'Monthly bill', key: 'bill', width: 18 },
    { header: 'Source', key: 'source', width: 14 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'System (kW)', key: 'kw', width: 13 },
    { header: 'Quote (₹)', key: 'quote', width: 16 },
    { header: 'Visit date', key: 'visit', width: 14 },
    { header: 'Assigned to', key: 'assigned', width: 18 },
    { header: 'Notes', key: 'notes', width: 44 },
  ];
  headerRow(d, 1);

  leads.forEach((l) => {
    d.addRow({
      date: new Date(l.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
      name: l.name,
      phone: l.phone,
      email: l.email ?? '',
      city: l.city ?? '',
      service: l.service ?? '',
      bill: l.bill ?? '',
      source: l.source ?? '',
      status: l.status,
      kw: l.systemKw ?? '',
      quote: l.quoteAmount ?? '',
      visit: l.visitDate ?? '',
      assigned: l.assignedTo ?? '',
      notes: l.notes ?? '',
    });
  });

  d.getColumn('quote').numFmt = '₹#,##0';
  d.autoFilter = { from: 'A1', to: { row: 1, column: d.columns.length } };

  const buffer = Buffer.from(await wb.xlsx.writeBuffer());
  return {
    buffer,
    filename: `RR-Solar-Report-${report.range.from.slice(0, 7)}.xlsx`,
    label: report.range.label,
  };
}
