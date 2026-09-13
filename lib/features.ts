/**
 * Feature flags.
 *
 * These are NEXT_PUBLIC_* because the admin UI reads them in the browser, which
 * means they are baked in at BUILD time — after changing one, restart the dev
 * server or redeploy.
 *
 * Default is OFF for both: turn a feature on by setting the value to "true".
 */
const on = (v: string | undefined) => v === 'true';

export const FEATURES = {
  /** Click-to-call buttons in the admin panel (lead rows, site visits). */
  call: on(process.env.NEXT_PUBLIC_ENABLE_CALL),
  /** "Email to customer" button that sends the quotation PDF via Resend. */
  emailQuotation: on(process.env.NEXT_PUBLIC_ENABLE_EMAIL_QUOTATION),
} as const;
