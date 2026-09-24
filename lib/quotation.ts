/**
 * Quotation maths. Pure functions, no I/O — so the same numbers are used by the
 * PDF, the admin preview and any future customer-facing calculator.
 *
 * IMPORTANT: every assumption below is an estimate and is printed on the PDF as
 * such. Verify the subsidy slabs against the current scheme before sending
 * quotations — government rates change.
 */

/** PM Surya Ghar central subsidy, residential rooftop only.
 *  ₹30,000 per kW for the first 2 kW, ₹18,000 for the 3rd, capped at ₹78,000. */
export const SUBSIDY = {
  perKwFirst2: 30000,
  thirdKw: 18000,
  max: 78000,
} as const;

/** Generation and savings assumptions — tune these for your region. */
export const ASSUMPTIONS = {
  /** kWh generated per kWp per year. Typical north-India range is 1,300–1,550. */
  yieldPerKwpPerYear: 1450,
  /** ₹ per unit used for the savings estimate. Set to the customer's actual slab rate. */
  tariffPerUnit: 8,
  /** Annual module degradation, used only for the 25-year figure. */
  degradationPerYear: 0.006,
} as const;

export type QuotationInput = {
  systemKw: number;
  totalAmount: number;      // ₹ quoted, inclusive of everything
  applySubsidy: boolean;    // residential only
};

export type QuotationMaths = {
  systemKw: number;
  totalAmount: number;
  ratePerKw: number;
  subsidy: number;
  netCost: number;
  annualUnits: number;
  annualSavings: number;
  monthlySavings: number;
  paybackYears: number | null;
  lifetimeUnits: number;
};

export function centralSubsidy(kw: number): number {
  if (kw <= 0) return 0;
  const first2 = Math.min(kw, 2) * SUBSIDY.perKwFirst2;
  const third = kw > 2 ? Math.min(kw - 2, 1) * SUBSIDY.thirdKw : 0;
  return Math.round(Math.min(first2 + third, SUBSIDY.max));
}

export function calculateQuotation({ systemKw, totalAmount, applySubsidy }: QuotationInput): QuotationMaths {
  const kw = Math.max(systemKw, 0);
  const total = Math.max(totalAmount, 0);
  const subsidy = applySubsidy ? centralSubsidy(kw) : 0;
  const netCost = Math.max(total - subsidy, 0);

  const annualUnits = Math.round(kw * ASSUMPTIONS.yieldPerKwpPerYear);
  const annualSavings = Math.round(annualUnits * ASSUMPTIONS.tariffPerUnit);

  // Payback is measured against net cost, because the subsidy is money the
  // customer gets back — but see the PDF note: it arrives after commissioning,
  // not as an upfront discount.
  const paybackYears = annualSavings > 0 ? Math.round((netCost / annualSavings) * 10) / 10 : null;

  // 25-year total with linear degradation applied.
  const lifetimeUnits = Math.round(
    annualUnits * 25 * (1 - (ASSUMPTIONS.degradationPerYear * 24) / 2),
  );

  return {
    systemKw: kw,
    totalAmount: total,
    ratePerKw: kw > 0 ? Math.round(total / kw) : 0,
    subsidy,
    netCost,
    annualUnits,
    annualSavings,
    monthlySavings: Math.round(annualSavings / 12),
    paybackYears,
    lifetimeUnits,
  };
}

/** Indian digit grouping without the ₹ glyph.
 *  pdf-lib's standard fonts use WinAnsi encoding, which has no U+20B9, so the
 *  PDF must say "Rs." — attempting to draw ₹ throws at render time. */
export function rs(n: number): string {
  return `Rs. ${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.round(n || 0))}`;
}

/** Quotation number: RRS/2026/0731/A1B2 — sortable and unique enough by hand. */
export function quotationNumber(leadId: string, date = new Date()): string {
  const y = date.getFullYear();
  const md = `${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  return `RRS/${y}/${md}/${leadId.slice(-4).toUpperCase()}`;
}

/* ------------------------------------------------------------------ */
/* Amount in words — Indian numbering (lakh / crore, not million)      */
/* ------------------------------------------------------------------ */

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  const t = TENS[Math.floor(n / 10)];
  const o = ONES[n % 10];
  return o ? `${t} ${o}` : t;
}

/**
 * "Two Lakh Ten Thousand Rupees Only" — the Indian grouping a customer expects
 * on a quotation, not the Western million/billion scale.
 */
export function amountInWords(amount: number): string {
  const n = Math.round(Math.abs(amount || 0));
  if (n === 0) return 'Zero Rupees Only';

  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const hundred = Math.floor((n % 1000) / 100);
  const rest = n % 100;

  const parts: string[] = [];
  if (crore) parts.push(`${twoDigits(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (hundred) parts.push(`${ONES[hundred]} Hundred`);
  if (rest) parts.push(twoDigits(rest));

  return `${parts.join(' ')} Rupees Only`;
}

/* ------------------------------------------------------------------ */
/* Bill of materials                                                   */
/* ------------------------------------------------------------------ */

/** Component specs. Edit these once and every future quotation follows. */
export const BOM_DEFAULTS = {
  panelWattage: 545,
  panelMake: 'UTL / Loom bifacial',
  inverterMake: 'Loom',
  wireMakes: 'Polycab / Havells / KEI',
  earthingRods: 3,
  moduleWarrantyYears: 30,
  inverterWarrantyYears: 5,
  installationDays: 10,
  cancellationCharge: 5000,
  advancePercent: 30,
} as const;

export type BomLine = { label: string; qty?: string };

/**
 * Default component list for a given system size. Panel count and inverter
 * rating are derived from kW; everything else is standard scope.
 *
 * This is a starting point the team can edit per quotation, not a fixed list.
 */
export function defaultBom(systemKw: number, phase: '1 phase' | '3 phase' = '1 phase'): BomLine[] {
  const kw = Math.max(systemKw, 0);
  const panels = kw > 0 ? Math.ceil((kw * 1000) / BOM_DEFAULTS.panelWattage) : 0;
  // Inverters are sold in whole-kW steps and are commonly sized at or just
  // above array size, so round up rather than matching kW exactly.
  const inverterKw = Math.max(Math.ceil(kw), 1);

  return [
    { label: `${BOM_DEFAULTS.panelMake} panel ${BOM_DEFAULTS.panelWattage} to 555 Wp`, qty: panels ? `${String(panels).padStart(2, '0')} Nos.` : '' },
    { label: `On-Grid ${BOM_DEFAULTS.inverterMake} inverter ${inverterKw} kW (${phase})`, qty: '1 No.' },
    { label: 'Solar GI structure, front leg height as per site requirement', qty: '1 Set' },
    { label: `AC wire and DC wire — ${BOM_DEFAULTS.wireMakes} (4 sq mm)` },
    { label: 'Earthing wire — CCA wire 4 sq mm' },
    { label: 'Earthing rod, 3 metre copper bonded', qty: `${String(BOM_DEFAULTS.earthingRods).padStart(2, '0')} Nos.` },
    { label: 'Lightning arrester, copper bonded', qty: '1 No.' },
    { label: `Net meter (${phase}) as per DISCOM`, qty: '1 No.' },
    { label: 'Assistance in availing net metering from DISCOM' },
    { label: 'Subsidy filing as per UPNEDA guidelines' },
  ];
}

/** Terms printed on every quotation. Numbered in the PDF. */
export function standardTerms(totalAmount: number): string[] {
  const advance = Math.round((totalAmount * BOM_DEFAULTS.advancePercent) / 100);
  return [
    `Payment terms: ${BOM_DEFAULTS.advancePercent}% as advance at the time of booking (${rs(advance)}), balance ${
      100 - BOM_DEFAULTS.advancePercent
    }% before dispatch of material (modules and inverter).`,
    `Solar system installation: ${BOM_DEFAULTS.installationDays} days from 100% payment, subject to availability of material and site clearance.`,
    'Net metering: as per DISCOM guidelines and procedure.',
    'Subsidy amount as per prevailing government policy, reimbursed directly into the customer’s account.',
    `Warranties: solar PV module ${BOM_DEFAULTS.moduleWarrantyYears} years by manufacturer; solar inverter ${BOM_DEFAULTS.inverterWarrantyYears} years by manufacturer.`,
    `Order cancellation charges: ${rs(BOM_DEFAULTS.cancellationCharge)}.`,
  ];
}
