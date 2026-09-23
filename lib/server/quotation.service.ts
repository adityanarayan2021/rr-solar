import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { ASSUMPTIONS, calculateQuotation, quotationNumber, rs, type QuotationMaths } from '../quotation';
import { site } from '../site';
import type { Lead } from '../lead-types';

const NAVY = rgb(0.055, 0.165, 0.361);
const SOLAR = rgb(0.961, 0.569, 0.118);
const LEAF = rgb(0.180, 0.620, 0.310);
const GREY = rgb(0.42, 0.45, 0.5);
const LIGHT = rgb(0.945, 0.957, 0.976);
const WHITE = rgb(1, 1, 1);

const A4 = { w: 595.28, h: 841.89 };
const M = 46; // page margin

type Fonts = { regular: PDFFont; bold: PDFFont };

function text(
  page: PDFPage,
  str: string,
  x: number,
  y: number,
  opts: { font: PDFFont; size?: number; color?: ReturnType<typeof rgb> } ,
) {
  page.drawText(str, { x, y, size: opts.size ?? 10, font: opts.font, color: opts.color ?? NAVY });
}

function rightText(page: PDFPage, str: string, right: number, y: number, o: { font: PDFFont; size?: number; color?: ReturnType<typeof rgb> }) {
  const size = o.size ?? 10;
  const w = o.font.widthOfTextAtSize(str, size);
  text(page, str, right - w, y, { ...o, size });
}

/** Naive word wrap — adequate for the short paragraphs on this document. */
function wrap(str: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = str.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(test, size) > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

function header(page: PDFPage, f: Fonts, quoteNo: string) {
  page.drawRectangle({ x: 0, y: A4.h - 118, width: A4.w, height: 118, color: NAVY });

  // Chain the x positions off measured widths — fixed offsets collide as soon as
  // the font or size changes.
  const logoSize = 22;
  const parts: [string, ReturnType<typeof rgb>][] = [
    ['R R ', WHITE],
    ['SOLAR ', SOLAR],
    ['SOLUTIONS', WHITE],
  ];
  let lx = M;
  for (const [part, color] of parts) {
    text(page, part, lx, A4.h - 52, { font: f.bold, size: logoSize, color });
    lx += f.bold.widthOfTextAtSize(part, logoSize);
  }
  text(page, 'COMPLETE SOLAR ENERGY PARTNER', M, A4.h - 68, { font: f.regular, size: 7.5, color: rgb(0.7, 0.76, 0.86) });
  text(page, 'MNRE Approved  |  Net Metering Assistance', M, A4.h - 88, { font: f.regular, size: 8, color: rgb(0.7, 0.76, 0.86) });

  rightText(page, 'QUOTATION', A4.w - M, A4.h - 46, { font: f.bold, size: 15, color: SOLAR });
  rightText(page, quoteNo, A4.w - M, A4.h - 62, { font: f.regular, size: 8.5, color: WHITE });
  rightText(page, new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }), A4.w - M, A4.h - 76, {
    font: f.regular, size: 8.5, color: rgb(0.7, 0.76, 0.86),
  });
  rightText(page, `+91 ${site.phones[0]}  |  ${site.email}`, A4.w - M, A4.h - 96, {
    font: f.regular, size: 7.5, color: rgb(0.7, 0.76, 0.86),
  });
}

function footer(page: PDFPage, f: Fonts) {
  page.drawRectangle({ x: 0, y: 0, width: A4.w, height: 54, color: NAVY });
  text(page, `${site.address.street}, ${site.address.city} - ${site.address.postalCode}, ${site.address.region}`, M, 33, {
    font: f.regular, size: 7.5, color: rgb(0.72, 0.78, 0.87),
  });
  const contactLine = `${site.phones.map((p) => `+91 ${p}`).join('  |  ')}  |  ${site.email}  |  www.rrsolarsolutions.in`;
  text(page, contactLine, M, 20, {
    font: f.regular, size: 7.5, color: rgb(0.72, 0.78, 0.87),
  });
}

function sectionTitle(page: PDFPage, f: Fonts, label: string, y: number) {
  page.drawRectangle({ x: M, y: y - 3, width: 3, height: 12, color: SOLAR });
  text(page, label.toUpperCase(), M + 10, y, { font: f.bold, size: 9.5, color: NAVY });
}

export async function buildQuotationPdf(lead: Lead, opts: { applySubsidy: boolean }): Promise<Uint8Array> {
  const q: QuotationMaths = calculateQuotation({
    systemKw: lead.systemKw ?? 0,
    totalAmount: lead.quoteAmount ?? 0,
    applySubsidy: opts.applySubsidy,
  });

  const doc = await PDFDocument.create();
  doc.setTitle(`Quotation - ${lead.name}`);
  doc.setAuthor(site.name);

  const f: Fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };

  const page = doc.addPage([A4.w, A4.h]);
  const quoteNo = quotationNumber(lead.id);
  header(page, f, quoteNo);

  let y = A4.h - 152;

  // ---- Customer ----
  sectionTitle(page, f, 'Prepared for', y);
  y -= 18;
  text(page, lead.name, M + 10, y, { font: f.bold, size: 12 });
  y -= 14;
  const lines = [
    `Mobile: +91 ${lead.phone}`,
    lead.email ? `Email: ${lead.email}` : '',
    lead.city ? `Location: ${lead.city}` : '',
    lead.service ? `Requirement: ${lead.service}` : '',
  ].filter(Boolean);
  for (const l of lines) {
    text(page, l, M + 10, y, { font: f.regular, size: 9, color: GREY });
    y -= 12.5;
  }

  // ---- System summary band ----
  y -= 10;
  page.drawRectangle({ x: M, y: y - 46, width: A4.w - M * 2, height: 54, color: LIGHT });
  const cellW = (A4.w - M * 2) / 3;
  const cells: [string, string][] = [
    ['SYSTEM SIZE', `${q.systemKw} kW`],
    ['EST. ANNUAL GENERATION', `${q.annualUnits.toLocaleString('en-IN')} units`],
    ['EST. MONTHLY SAVING', rs(q.monthlySavings)],
  ];
  cells.forEach(([label, value], i) => {
    const cx = M + cellW * i + 14;
    text(page, label, cx, y - 14, { font: f.regular, size: 7, color: GREY });
    text(page, value, cx, y - 32, { font: f.bold, size: 13, color: NAVY });
  });
  y -= 70;

  // ---- Pricing ----
  sectionTitle(page, f, 'Commercial offer', y);
  y -= 22;

  const rowsY: number[] = [];
  const priceRow = (label: string, value: string, bold = false, color = NAVY) => {
    text(page, label, M + 10, y, { font: bold ? f.bold : f.regular, size: 10, color });
    rightText(page, value, A4.w - M - 10, y, { font: bold ? f.bold : f.regular, size: 10, color });
    rowsY.push(y);
    y -= 20;
  };

  priceRow(`Supply & installation — ${q.systemKw} kW solar power plant`, rs(q.totalAmount));
  text(page, `(approx. ${rs(q.ratePerKw)} per kW, inclusive of structure, cabling, safety gear and commissioning)`, M + 10, y + 8, {
    font: f.regular, size: 7.5, color: GREY,
  });
  y -= 8;

  if (q.subsidy > 0) {
    priceRow('Less: PM Surya Ghar central subsidy', `- ${rs(q.subsidy)}`, false, LEAF);
  }

  page.drawLine({ start: { x: M + 10, y: y + 12 }, end: { x: A4.w - M - 10, y: y + 12 }, thickness: 0.8, color: rgb(0.85, 0.87, 0.9) });
  y -= 6;
  page.drawRectangle({ x: M, y: y - 8, width: A4.w - M * 2, height: 28, color: NAVY });
  text(page, q.subsidy > 0 ? 'NET COST AFTER SUBSIDY' : 'TOTAL PAYABLE', M + 10, y + 2, { font: f.bold, size: 10.5, color: WHITE });
  rightText(page, rs(q.netCost), A4.w - M - 10, y + 2, { font: f.bold, size: 12.5, color: SOLAR });
  y -= 34;

  if (q.subsidy > 0) {
    const note = 'Note: the central subsidy is paid directly into your bank account by the government after the system is commissioned and inspected by the discom. It is not an upfront discount — the full amount is payable to us at the agreed milestones.';
    for (const l of wrap(note, f.regular, 7.8, A4.w - M * 2 - 16)) {
      text(page, l, M + 8, y, { font: f.regular, size: 7.8, color: GREY });
      y -= 10;
    }
    y -= 6;
  }

  // ---- Savings ----
  sectionTitle(page, f, 'Estimated returns', y);
  y -= 20;
  const savingsRows: [string, string][] = [
    ['Estimated annual generation', `${q.annualUnits.toLocaleString('en-IN')} units`],
    ['Estimated annual saving', rs(q.annualSavings)],
    ['Estimated payback period', q.paybackYears ? `${q.paybackYears} years` : '—'],
    ['Estimated 25-year generation', `${q.lifetimeUnits.toLocaleString('en-IN')} units`],
  ];
  savingsRows.forEach(([k, v], i) => {
    if (i % 2 === 0) page.drawRectangle({ x: M, y: y - 5, width: A4.w - M * 2, height: 18, color: LIGHT });
    text(page, k, M + 10, y, { font: f.regular, size: 9, color: GREY });
    rightText(page, v, A4.w - M - 10, y, { font: f.bold, size: 9.5, color: NAVY });
    y -= 18;
  });

  y -= 6;
  const assume = `Estimates assume ${ASSUMPTIONS.yieldPerKwpPerYear} units per kW per year and a tariff of Rs. ${ASSUMPTIONS.tariffPerUnit} per unit. Actual generation varies with shading, orientation, weather and cleaning. These figures are indicative, not a guarantee.`;
  for (const l of wrap(assume, f.regular, 7.5, A4.w - M * 2 - 16)) {
    text(page, l, M + 8, y, { font: f.regular, size: 7.5, color: GREY });
    y -= 9.5;
  }

  // ---- Scope & terms ----
  y -= 14;
  sectionTitle(page, f, 'Scope & terms', y);
  y -= 18;
  const terms = [
    'Supply of solar modules, inverter, mounting structure, cabling, earthing and protection devices.',
    'Complete installation, testing and commissioning by our in-house certified team.',
    'Net-metering liaison with the discom: application, feasibility, inspection and meter installation.',
    'Assistance with the PM Surya Ghar subsidy application for eligible residential customers.',
    'Manufacturer warranties apply to modules and inverter; workmanship warranty provided by us.',
    'This quotation is valid for 15 days from the date above and is subject to a final site survey.',
  ];
  for (const t of terms) {
    page.drawCircle({ x: M + 13, y: y + 3, size: 1.8, color: SOLAR });
    for (const [i, l] of wrap(t, f.regular, 8.5, A4.w - M * 2 - 30).entries()) {
      text(page, l, M + 22, y - i * 10.5, { font: f.regular, size: 8.5, color: GREY });
    }
    y -= 10.5 * wrap(t, f.regular, 8.5, A4.w - M * 2 - 30).length + 4;
  }

  y -= 4;
  text(page, 'For RR Solar Solutions', M, y, { font: f.bold, size: 9 });
  text(page, 'Accepted by customer', A4.w - M - 130, y, { font: f.bold, size: 9 });
  page.drawLine({ start: { x: M, y: y - 26 }, end: { x: M + 150, y: y - 26 }, thickness: 0.7, color: rgb(0.75, 0.78, 0.82) });
  page.drawLine({ start: { x: A4.w - M - 150, y: y - 26 }, end: { x: A4.w - M, y: y - 26 }, thickness: 0.7, color: rgb(0.75, 0.78, 0.82) });

  footer(page, f);
  return doc.save();
}

export { quotationNumber };
