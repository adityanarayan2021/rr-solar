'use client';

import type { Attribution, LeadSource } from './lead-types';

const KEY = 'rr_attr';

/**
 * First-touch attribution. Captured in the browser and stored for the session,
 * so a visitor who arrives from Google, browses, and submits an hour later is
 * still credited to Google rather than to "Direct".
 *
 * Deliberately first-touch, not last-touch: it answers "which channel found me
 * this customer", which is the question that decides ad spend.
 */
function classify(referrer: string, utmSource?: string, utmMedium?: string): LeadSource {
  const um = (utmMedium ?? '').toLowerCase();
  const us = (utmSource ?? '').toLowerCase();

  if (um.includes('cpc') || um.includes('ppc') || um.includes('paid')) return 'Paid Ads';
  if (us.includes('google') || us.includes('bing')) return 'Google';
  if (us.includes('whatsapp')) return 'WhatsApp';
  if (us.includes('facebook') || us.includes('instagram') || us.includes('linkedin')) return 'Social';
  if (us) return 'Other';

  if (!referrer) return 'Direct';
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, '');
    if (host.includes('google') || host.includes('bing') || host.includes('duckduckgo')) return 'Google';
    if (host.includes('whatsapp')) return 'WhatsApp';
    if (/facebook|instagram|linkedin|youtube|twitter|x\.com|t\.co/.test(host)) return 'Social';
    if (host.includes('rrsolarsolutions')) return 'Direct';
    return 'Referral';
  } catch {
    return 'Direct';
  }
}

export function captureAttribution(): void {
  if (typeof window === 'undefined') return;
  try {
    if (sessionStorage.getItem(KEY)) return; // first touch wins
    const p = new URLSearchParams(window.location.search);
    const utmSource = p.get('utm_source') ?? undefined;
    const utmMedium = p.get('utm_medium') ?? undefined;
    const data: Attribution = {
      source: classify(document.referrer, utmSource, utmMedium),
      utmSource,
      utmMedium,
      utmCampaign: p.get('utm_campaign') ?? undefined,
      referrer: document.referrer || undefined,
      landingPage: window.location.pathname + window.location.search,
    };
    sessionStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Private browsing can block sessionStorage — attribution is optional, never fatal.
  }
}

export function getAttribution(): Partial<Attribution> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Attribution;
    return { source: classify(document.referrer), referrer: document.referrer || undefined };
  } catch {
    return {};
  }
}
