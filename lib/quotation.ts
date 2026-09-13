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
