/**
 * Client-safe types and constants. Kept separate from the server services so
 * client components never pull the MongoDB driver into the browser bundle.
 */
export const LEAD_STATUSES = ['New', 'Contacted', 'Visit Booked', 'Quoted', 'Won', 'Lost'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

/** Statuses that represent live pipeline (not yet won or lost). */
export const OPEN_STATUSES: LeadStatus[] = ['New', 'Contacted', 'Visit Booked', 'Quoted'];

export const LEAD_SOURCES = ['Google', 'WhatsApp', 'Direct', 'Social', 'Referral', 'Paid Ads', 'Other'] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

/** What the public form collects. */
export type LeadInput = {
  name: string;
  phone: string;
  email?: string;
  city?: string;
  service?: string;
  bill?: string;
  message?: string;
};

/** First-touch attribution captured in the browser at submit time. */
export type Attribution = {
  source: LeadSource;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  referrer?: string;
  landingPage?: string;
};

/** Fields the team fills in later, from the admin dashboard. */
export type LeadOps = {
  status: LeadStatus;
  notes: string;
  systemKw?: number;      // proposed system size
  quoteAmount?: number;   // quoted value in INR — drives pipeline and closed-value reporting
  visitDate?: string;     // ISO date of the site survey
  assignedTo?: string;    // technician or salesperson
};

export type Lead = LeadInput & LeadOps & Attribution & {
  id: string;
  createdAt: string;
  updatedAt: string;
};

export const inr = (n: number): string =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
