/**
 * Thin wrapper over GA4 + Microsoft Clarity. Both are optional: if the env vars
 * are absent the scripts never load and every call here is a silent no-op, so
 * the site works identically with analytics switched off.
 */
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    clarity?: (...args: unknown[]) => void;
  }
}

export type TrackEvent =
  | 'lead_submit'          // form submitted successfully — your primary conversion
  | 'lead_submit_failed'
  | 'whatsapp_click'
  | 'call_click'
  | 'quote_cta_click';

export function track(event: TrackEvent, params: Record<string, string | number> = {}): void {
  if (typeof window === 'undefined') return;
  try {
    window.gtag?.('event', event, params);
    // Clarity tags let you filter session recordings by behaviour,
    // e.g. watch only the sessions where someone actually submitted the form.
    window.clarity?.('event', event);
  } catch {
    // Analytics must never break the page.
  }
}
