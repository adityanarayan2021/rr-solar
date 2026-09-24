import fs from 'node:fs/promises';
import path from 'node:path';
import { PDFDocument, StandardFonts, degrees, rgb, type PDFFont, type PDFPage, type PDFImage } from 'pdf-lib';
import {
  amountInWords,
  calculateQuotation,
  defaultBom,
  quotationNumber,
  rs,
  standardTerms,
  type BomLine,
} from '../quotation';
import { site } from '../site';
import { logger } from './logger';
import type { Lead } from '../lead-types';

/* ------------------------------------------------------------------ */
/* Palette and page geometry                                           */
/* ------------------------------------------------------------------ */

const NAVY = rgb(0.055, 0.165, 0.361);
const SOLAR = rgb(0.961, 0.569, 0.118);
const GREY = rgb(0.35, 0.38, 0.43);
const LINE = rgb(0.0, 0.0, 0.0);
const WHITE = rgb(1, 1, 1);

const A4 = { w: 595.28, h: 841.89 };
const M = 26;                        // outer page margin
const BOX = { x: M + 8, w: A4.w - (M + 8) * 2 };

type Fonts = { regular: PDFFont; bold: PDFFont; italic: PDFFont; boldItalic: PDFFont };

/* ------------------------------------------------------------------ */
/* Small drawing helpers                                               */
/* ------------------------------------------------------------------ */

function text(
  page: PDFPage,
  str: string,
  x: number,
  y: number,
  o: { font: PDFFont; size?: number; color?: ReturnType<typeof rgb> },
) {
  page.drawText(str, { x, y, size: o.size ?? 9, font: o.font, color: o.color ?? NAVY });
}

function centred(page: PDFPage, str: string, cx: number, y: number, o: { font: PDFFont; size?: number; color?: ReturnType<typeof rgb> }) {
  const size = o.size ?? 9;
  text(page, str, cx - o.font.widthOfTextAtSize(str, size) / 2, y, { ...o, size });
}

function rightAlign(page: PDFPage, str: string, right: number, y: number, o: { font: PDFFont; size?: number; color?: ReturnType<typeof rgb> }) {
  const size = o.size ?? 9;
  text(page, str, right - o.font.widthOfTextAtSize(str, size), y, { ...o, size });
}

function box(page: PDFPage, x: number, y: number, w: number, h: number, thickness = 0.9) {
  page.drawRectangle({ x, y, width: w, height: h, borderColor: LINE, borderWidth: thickness });
}

/** Greedy word wrap. Returns the lines; callers decide spacing. */
function wrap(str: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const out: string[] = [];
  let line = '';
  for (const word of str.split(' ')) {
    const test = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) > maxWidth && line) {
      out.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) out.push(line);
  return out;
}

/* ------------------------------------------------------------------ */
/* Logo                                                                */
/* ------------------------------------------------------------------ */

/**
 * Loads public/logo.png (or .jpg) if it exists, so dropping the real artwork
 * into that folder replaces the drawn fallback everywhere — header and
 * watermark — with no code change.
 */
async function loadLogo(doc: PDFDocument): Promise<PDFImage | null> {
  for (const file of ['logo.png', 'logo.jpg', 'logo.jpeg']) {
    try {
      const bytes = await fs.readFile(path.join(process.cwd(), 'public', file));
      return file.endsWith('.png') ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
    } catch {
      // try the next candidate
    }
  }
  return null;
}

const PANEL_BLUE = rgb(0.106, 0.298, 0.607);
const LEAF_GREEN = rgb(0.18, 0.62, 0.31);

/**
 * Vector stand-in for the brand mark, used until public/logo.png exists:
 * a fan of sun rays arcing over a bold "RR", with a tilted solar panel and a
 * leaf beneath. Drawn in a 64x64 space and scaled, so one `size` controls it.
 */
function drawVectorLogo(page: PDFPage, f: Fonts, x: number, y: number, size: number, opacity = 1) {
  const s = size / 64;
  const cx = x + size / 2;
  const px = (v: number) => cx + v * s;
  const py = (v: number) => y + v * s;

  // --- sun: a fan of rays radiating from behind the letters ---
  const sunCx = 0;
  const sunCy = 44;
  for (let i = 0; i < 9; i++) {
    const angle = Math.PI * (0.08 + (i / 8) * 0.84); // left to right across the top
    const inner = 13;
    const outer = 19;
    page.drawLine({
      start: { x: px(sunCx + Math.cos(angle) * inner), y: py(sunCy + Math.sin(angle) * inner) },
      end: { x: px(sunCx + Math.cos(angle) * outer), y: py(sunCy + Math.sin(angle) * outer) },
      thickness: 2.2 * s,
      color: SOLAR,
      opacity,
    });
  }
  // sun disc arc sitting behind the wordmark
  page.drawCircle({ x: px(sunCx), y: py(sunCy), size: 10.5 * s, color: SOLAR, opacity: opacity * 0.9 });

  // --- RR wordmark: first letter navy, second orange, as in the brand ---
  const letterSize = 26 * s;
  const r1 = 'R';
  const r2 = 'R';
  const w1 = f.bold.widthOfTextAtSize(r1, letterSize);
  const w2 = f.bold.widthOfTextAtSize(r2, letterSize);
  const startX = px(0) - (w1 + w2) / 2;
  page.drawText(r1, { x: startX, y: py(26), size: letterSize, font: f.bold, color: NAVY, opacity });
  page.drawText(r2, { x: startX + w1, y: py(26), size: letterSize, font: f.bold, color: SOLAR, opacity });

  // --- tilted solar panel ---
  const panel = [
    { x: px(-21), y: py(16) },
    { x: px(3), y: py(16) },
    { x: px(9), y: py(4) },
    { x: px(-15), y: py(4) },
  ];
  page.drawSvgPath(
    `M ${panel[0].x} ${-panel[0].y} L ${panel[1].x} ${-panel[1].y} L ${panel[2].x} ${-panel[2].y} L ${panel[3].x} ${-panel[3].y} Z`,
    { x: 0, y: 0, color: PANEL_BLUE, opacity: opacity * 0.95 },
  );
  // cell divisions
  for (let i = 1; i <= 2; i++) {
    const t = i / 3;
    page.drawLine({
      start: { x: px(-21 + 24 * t), y: py(16) },
      end: { x: px(-15 + 24 * t), y: py(4) },
      thickness: 0.7 * s, color: WHITE, opacity,
    });
  }
  page.drawLine({
    start: { x: px(-18), y: py(10) }, end: { x: px(6), y: py(10) },
    thickness: 0.7 * s, color: WHITE, opacity,
  });

  // --- leaf ---
  page.drawSvgPath(
    `M ${px(11)} ${-py(14)} C ${px(20)} ${-py(17)} ${px(24)} ${-py(11)} ${px(21)} ${-py(4)} C ${px(14)} ${-py(6)} ${px(10)} ${-py(9)} ${px(11)} ${-py(14)} Z`,
    { x: 0, y: 0, color: LEAF_GREEN, opacity },
  );
}

/**
 * Diagonal watermark. Drawn first so every element that follows sits on top of
 * it — pdf-lib has no z-index, painting order is the only control.
 */
function drawWatermark(page: PDFPage, f: Fonts, logo: PDFImage | null) {
  const cx = A4.w / 2;
  const cy = A4.h / 2;

  // Deliberately very faint. A watermark that competes with the table makes the
  // quotation harder to read, which defeats the point of the document — it
  // should register as a background texture, not as content.
  const MARK = 0.03;
  const WORD = 0.035;

  if (logo) {
    const w = 240;
    const h = (logo.height / logo.width) * w;
    page.drawImage(logo, { x: cx - w / 2, y: cy - h / 2, width: w, height: h, opacity: MARK });
  } else {
    drawVectorLogo(page, f, cx - 55, cy - 45, 110, MARK);
  }

  page.drawText('RR SOLAR', {
    x: cx - 190, y: cy - 132, size: 62, font: f.bold,
    color: SOLAR, opacity: WORD, rotate: degrees(0),
  });
  page.drawText('SOLUTIONS & EARTHING SYSTEMS', {
    x: cx - 188, y: cy - 158, size: 18.7, font: f.bold,
    color: NAVY, opacity: WORD * 0.85,
  });
}

/* ------------------------------------------------------------------ */
/* Document                                                            */
/* ------------------------------------------------------------------ */

export async function buildQuotationPdf(lead: Lead, opts: { applySubsidy: boolean }): Promise<Uint8Array> {
  const q = calculateQuotation({
    systemKw: lead.systemKw ?? 0,
    totalAmount: lead.quoteAmount ?? 0,
    applySubsidy: opts.applySubsidy,
  });

  const doc = await PDFDocument.create();
  doc.setTitle(`Quotation - ${lead.name}`);
  doc.setAuthor(site.legalName);
  doc.setSubject('Solar power plant quotation');

  const f: Fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
    italic: await doc.embedFont(StandardFonts.HelveticaOblique),
    boldItalic: await doc.embedFont(StandardFonts.HelveticaBoldOblique),
  };

  const page = doc.addPage([A4.w, A4.h]);
  const logo = await loadLogo(doc);

  // 1. Watermark first — everything else paints over it.
  drawWatermark(page, f, logo);

  // 2. Page border
  box(page, M, M, A4.w - M * 2, A4.h - M * 2, 1.1);

  let y = A4.h - M - 18;

  /* ---------- Letterhead ---------- */
  const logoSize = 52;
  if (logo) {
    const w = logoSize;
    const h = (logo.height / logo.width) * w;
    page.drawImage(logo, { x: BOX.x, y: y - h + 6, width: w, height: h });
  } else {
    drawVectorLogo(page, f, BOX.x, y - logoSize + 8, logoSize);
  }

  // "RR SOLAR SOLUTIONS" with SOLAR in orange, then the suffix — widths are
  // measured and chained so the words never collide.
  const brandSize = 26;
  let bx = BOX.x + logoSize + 16;
  const brandY = y - 26;
  for (const [word, colour] of [['RR ', NAVY], ['SOLAR ', SOLAR], ['SOLUTIONS', NAVY]] as const) {
    text(page, word, bx, brandY, { font: f.bold, size: brandSize, color: colour });
    bx += f.bold.widthOfTextAtSize(word, brandSize);
  }
  text(page, ' & EARTHING SYSTEMS', bx, brandY + 2, { font: f.bold, size: 9, color: NAVY });

  // Certification strip — small pills, so the accreditations read as badges
  // rather than as part of the company name.
  let cx2 = BOX.x + logoSize + 18;
  const pillY = brandY - 15;
  for (const cert of site.certifications) {
    const label = `${cert} CERTIFIED`;
    const w = f.bold.widthOfTextAtSize(label, 6.5) + 12;
    page.drawRectangle({
      x: cx2, y: pillY - 3, width: w, height: 12,
      color: NAVY, opacity: 0.08,
      borderColor: NAVY, borderWidth: 0.4, borderOpacity: 0.35,
    });
    text(page, label, cx2 + 6, pillY, { font: f.bold, size: 6.5, color: NAVY });
    cx2 += w + 6;
  }
  text(page, '|  Net Metering Assistance', cx2 + 2, pillY, { font: f.regular, size: 6.5, color: GREY });

  y -= logoSize + 6;

  /* ---------- Seller box ---------- */
  const sellerH = 30;
  box(page, BOX.x, y - sellerH, BOX.w, sellerH);
  text(page, 'Seller:', BOX.x + 6, y - 12, { font: f.bold, size: 8.5 });
  text(page, site.legalName, BOX.x + 36, y - 12, { font: f.regular, size: 8.5 });
  rightAlign(page, `Mob: ${site.phones[0]}`, BOX.x + BOX.w - 8, y - 12, { font: f.bold, size: 8.5 });
  text(page, `Email id – ${site.email}`, BOX.x + 6, y - 23, { font: f.regular, size: 8.5 });
  y -= sellerH;

  /* ---------- Buyer box (two columns) ---------- */
  const buyerH = 46;
  const mid = BOX.x + BOX.w / 2;
  box(page, BOX.x, y - buyerH, BOX.w, buyerH);
  page.drawLine({ start: { x: mid, y }, end: { x: mid, y: y - buyerH }, thickness: 0.9, color: LINE });

  const leftRows: [string, string][] = [
    ['Buyer Name:', lead.name],
    ['Elec. Load:', lead.elecLoad?.trim() || '—'],
    ['Date:', new Date().toLocaleDateString('en-GB')],
  ];
  const rightRows: [string, string][] = [
    ['Address:', lead.city || '—'],
    ['Mail Id:', lead.email || '—'],
    ['Mobile No:', lead.phone],
  ];
  leftRows.forEach(([k, v], i) => {
    const ry = y - 13 - i * 14;
    text(page, k, BOX.x + 6, ry, { font: f.bold, size: 8.5 });
    text(page, v, BOX.x + 74, ry, { font: f.regular, size: 8.5 });
  });
  rightRows.forEach(([k, v], i) => {
    const ry = y - 13 - i * 14;
    text(page, k, mid + 6, ry, { font: f.bold, size: 8.5 });
    text(page, v, mid + 64, ry, { font: f.regular, size: 8.5 });
  });
  y -= buyerH + 14;

  /* ---------- Greeting ---------- */
  text(page, 'Dear Sir,', BOX.x + 2, y, { font: f.bold, size: 9 });
  y -= 14;

  const intro =
    'We thank you for the kind interest shown in the installation of a Hybrid / On-grid / Off-grid rooftop solar plant at your premises. In line with our discussion, our offer is as follows:';
  for (const line of wrap(intro, f.regular, 8.5, BOX.w - 8)) {
    text(page, line, BOX.x + 2, y, { font: f.regular, size: 8.5, color: GREY });
    y -= 11;
  }
  y -= 8;

  /* ---------- Items table ---------- */
  const COL = {
    sr: BOX.x,
    srW: 34,
    partW: BOX.w - 34 - 54 - 150,
    qtyW: 54,
    amtW: 150,
  };
  const partX = COL.sr + COL.srW;
  const qtyX = partX + COL.partW;
  const amtX = qtyX + COL.qtyW;

  // header row
  const headH = 22;
  page.drawRectangle({ x: COL.sr, y: y - headH, width: BOX.w, height: headH, color: NAVY });
  centred(page, 'SR. NO.', COL.sr + COL.srW / 2, y - 14, { font: f.bold, size: 7.5, color: WHITE });
  centred(page, 'PARTICULAR', partX + COL.partW / 2, y - 14, { font: f.bold, size: 7.5, color: WHITE });
  centred(page, 'QTY.', qtyX + COL.qtyW / 2, y - 14, { font: f.bold, size: 7.5, color: WHITE });
  centred(page, 'AMOUNT TO BE PAID', amtX + COL.amtW / 2, y - 14, { font: f.bold, size: 7.5, color: WHITE });
  y -= headH;

  // body
  const bom: BomLine[] = defaultBom(q.systemKw);
  const rowTop = y;
  let ry = y - 16;

  text(page, `On-grid power generating system ${q.systemKw} kW`, partX + 6, ry, { font: f.bold, size: 9 });
  ry -= 15;

  for (const item of bom) {
    const lines = wrap(item.label, f.regular, 8.2, COL.partW - 14);
    lines.forEach((l, i) => {
      text(page, l, partX + 6, ry - i * 10.5, { font: f.regular, size: 8.2, color: GREY });
    });
    if (item.qty) {
      centred(page, item.qty, qtyX + COL.qtyW / 2, ry, { font: f.bold, size: 8.2 });
    }
    ry -= lines.length * 10.5 + 3.5;
  }

  const bodyH = rowTop - ry + 6;

  // SR number, vertically centred against the whole block. No separate "1 Set"
  // here — the structure line already carries it, and a second one collided
  // with the per-item quantities.
  centred(page, '1.', COL.sr + COL.srW / 2, rowTop - bodyH / 2, { font: f.bold, size: 9 });

  // amount, in figures and in words
  const amtCx = amtX + COL.amtW / 2;
  const amtY = rowTop - bodyH / 2 + 14;
  centred(page, `${rs(q.totalAmount)}/-`, amtCx, amtY, { font: f.bold, size: 10.5 });
  wrap(amountInWords(q.totalAmount), f.regular, 8, COL.amtW - 14).forEach((l, i) => {
    centred(page, l, amtCx, amtY - 14 - i * 10, { font: f.regular, size: 8, color: GREY });
  });

  // column separators and the row outline
  box(page, COL.sr, rowTop - bodyH, BOX.w, bodyH);
  for (const x of [partX, qtyX, amtX]) {
    page.drawLine({ start: { x, y: rowTop }, end: { x, y: rowTop - bodyH }, thickness: 0.9, color: LINE });
  }
  y = rowTop - bodyH;

  /* ---------- Bank row ---------- */
  const bankH = 26;
  box(page, COL.sr, y - bankH, BOX.w, bankH);
  centred(page, `All payments to: ${site.bank.accountName}`, A4.w / 2, y - 11, { font: f.bold, size: 8.2 });
  centred(
    page,
    `Bank IFSC Code: ${site.bank.ifsc}  |  ${site.bank.accountType} No.: ${site.bank.accountNumber}`,
    A4.w / 2,
    y - 21,
    { font: f.bold, size: 8.2 },
  );
  y -= bankH + 16;

  /* ---------- Terms ---------- */
  text(page, 'Terms and Conditions:', BOX.x + 2, y, { font: f.bold, size: 9 });
  page.drawLine({
    start: { x: BOX.x + 2, y: y - 2.5 },
    end: { x: BOX.x + 2 + f.bold.widthOfTextAtSize('Terms and Conditions:', 9), y: y - 2.5 },
    thickness: 0.7, color: LINE,
  });
  y -= 14;

  standardTerms(q.totalAmount).forEach((t, i) => {
    text(page, `${i + 1}.`, BOX.x + 4, y, { font: f.boldItalic, size: 8.2 });
    wrap(t, f.italic, 8.2, BOX.w - 26).forEach((l, li) => {
      text(page, l, BOX.x + 18, y - li * 10, { font: f.italic, size: 8.2, color: GREY });
    });
    y -= wrap(t, f.italic, 8.2, BOX.w - 26).length * 10 + 3;
  });

  text(page, `7.`, BOX.x + 4, y, { font: f.boldItalic, size: 8.2 });
  text(page, `Customer care: ${site.phones[0]}  |  Installation and service: ${site.phones[0]}`, BOX.x + 18, y, {
    font: f.italic, size: 8.2, color: GREY,
  });
  y -= 22;

  /* ---------- Signature block ---------- */
  const sigH = 54;
  const sigSplit = BOX.x + 150;
  box(page, BOX.x, y - sigH, BOX.w, sigH);
  page.drawLine({ start: { x: sigSplit, y }, end: { x: sigSplit, y: y - sigH }, thickness: 0.9, color: LINE });
  page.drawLine({
    start: { x: BOX.x, y: y - sigH + 16 }, end: { x: sigSplit, y: y - sigH + 16 },
    thickness: 0.9, color: LINE,
  });

  text(page, `For ${site.name.toUpperCase()}`, BOX.x + 6, y - 14, { font: f.bold, size: 8.5 });
  text(page, 'Authorized Signatory', BOX.x + 6, y - sigH + 5, { font: f.bold, size: 8.5 });

  wrap(
    'Quotation accepted with the above terms and conditions, and this equals a Purchase Order issued by the Buyer.',
    f.bold, 8.5, BOX.w - 168,
  ).forEach((l, i) => {
    text(page, l, sigSplit + 8, y - 14 - i * 11, { font: f.bold, size: 8.5 });
  });
  text(page, 'Signature of Buyer', sigSplit + 8, y - sigH + 8, { font: f.bold, size: 8.5 });

  /* ---------- Reference line ---------- */
  const quoteNo = quotationNumber(lead.id);
  text(page, `Quotation Ref: ${quoteNo}`, BOX.x, M + 8, { font: f.regular, size: 7, color: GREY });
  rightAlign(page, `${site.url.replace('https://', '')}  |  ${site.email}`, BOX.x + BOX.w, M + 8, {
    font: f.regular, size: 7, color: GREY,
  });

  logger.info('quotation.pdf_built', {
    leadId: lead.id, quoteNo, systemKw: q.systemKw, hasLogoFile: Boolean(logo),
  });

  return doc.save();
}

export { quotationNumber };
