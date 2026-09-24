'use client';

import { useEffect, useRef } from 'react';
import { LEAD_STATUSES, inr, type Lead, type LeadStatus } from '@/lib/lead-types';
import { FEATURES } from '@/lib/features';

export type DrawerPatch = Partial<
  Pick<Lead, 'status' | 'notes' | 'systemKw' | 'quoteAmount' | 'visitDate' | 'assignedTo' | 'elecLoad'>
>;

const statusStyles: Record<string, string> = {
  New: 'bg-solar/15 text-solar-600 ring-solar/30',
  Contacted: 'bg-blue-50 text-blue-700 ring-blue-200',
  'Visit Booked': 'bg-amber-50 text-amber-700 ring-amber-200',
  Quoted: 'bg-violet-50 text-violet-700 ring-violet-200',
  Won: 'bg-leaf/15 text-leaf ring-leaf/30',
  Lost: 'bg-slate-100 text-slate-500 ring-slate-200',
};

/**
 * Slide-over panel for one lead.
 *
 * Chosen over a centred modal because the list stays visible behind it, the
 * content scrolls independently of the page, and prev/next lets you work
 * through a day's enquiries without closing and reopening.
 */
export default function LeadDrawer({
  lead,
  onClose,
  onPatch,
  onDownload,
  onEmail,
  onPrev,
  onNext,
  position,
  busy,
  saving,
  invalidFields,
}: {
  lead: Lead;
  onClose: () => void;
  onPatch: (id: string, patch: DrawerPatch) => void;
  onDownload: (l: Lead) => void;
  onEmail: (l: Lead) => void;
  onPrev?: () => void;
  onNext?: () => void;
  position: { index: number; total: number };
  busy: boolean;
  saving: boolean;
  invalidFields: ('systemKw' | 'quoteAmount')[];
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Escape to close, and arrow keys to move between leads — but not while the
  // user is typing in a field, where those keys mean something else.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if (e.key === 'Escape') return onClose();
      if (typing) return;
      if (e.key === 'ArrowLeft' && onPrev) onPrev();
      if (e.key === 'ArrowRight' && onNext) onNext();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, onPrev, onNext]);

  // Stop the page behind from scrolling while the drawer is open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const isInvalid = (f: 'systemKw' | 'quoteAmount') => invalidFields.includes(f);
  const blocked = !lead.systemKw || !lead.quoteAmount;

  const field =
    'w-full rounded-lg border border-navy/15 bg-white px-3 py-2 text-sm outline-none transition focus:border-solar focus:ring-2 focus:ring-solar/20';
  const invalidField =
    'w-full rounded-lg border-2 border-red-400 bg-red-50 px-3 py-2 text-sm outline-none ring-2 ring-red-200';
  const cls = (f: 'systemKw' | 'quoteAmount') => (isInvalid(f) ? invalidField : field);
  const label = 'mb-1 block text-[11px] font-bold uppercase tracking-wider text-navy/45';

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section className="border-b border-navy/8 px-6 py-5 last:border-0">
      <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-navy/45">{title}</h3>
      {children}
    </section>
  );

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 w-full cursor-default bg-navy/40 backdrop-blur-[2px]"
        style={{ animation: 'drawer-fade .15s ease-out' }}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Lead: ${lead.name}`}
        className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col bg-white shadow-2xl"
        style={{ animation: 'drawer-in .22s cubic-bezier(.22,1,.36,1)' }}
      >
        {/* ---------- Header ---------- */}
        <header className="shrink-0 border-b border-navy/10 bg-white px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="truncate text-xl font-extrabold text-navy">{lead.name}</h2>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-navy/55">
                <span className="font-semibold text-navy">{lead.phone}</span>
                {lead.city && <span>{lead.city}</span>}
                <span>
                  {new Date(lead.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <button
                onClick={onPrev}
                disabled={!onPrev}
                aria-label="Previous lead"
                className="grid h-8 w-8 place-items-center rounded-lg text-navy/50 hover:bg-navy-50 hover:text-navy disabled:opacity-25"
              >
                ‹
              </button>
              <span className="px-1 text-[11px] font-semibold text-navy/40">
                {position.index + 1}/{position.total}
              </span>
              <button
                onClick={onNext}
                disabled={!onNext}
                aria-label="Next lead"
                className="grid h-8 w-8 place-items-center rounded-lg text-navy/50 hover:bg-navy-50 hover:text-navy disabled:opacity-25"
              >
                ›
              </button>
              <button
                onClick={onClose}
                aria-label="Close"
                className="ml-1 grid h-8 w-8 place-items-center rounded-lg text-navy/50 hover:bg-navy-50 hover:text-navy"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {LEAD_STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => onPatch(lead.id, { status: s as LeadStatus })}
                className={`rounded-full px-3 py-1.5 text-xs font-bold ring-1 transition ${
                  lead.status === s ? statusStyles[s] : 'bg-white text-navy/50 ring-navy/10 hover:ring-solar/40'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </header>

        {/* ---------- Scrollable body ---------- */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <Section title="Enquiry">
            <dl className="space-y-2 text-sm">
              {([
                ['Email', lead.email],
                ['Service', lead.service],
                ['Monthly bill', lead.bill],
                ['Source', lead.utmCampaign ? `${lead.source} · ${lead.utmCampaign}` : lead.source],
              ] as [string, string | undefined][]).map(([k, v]) => (
                <div key={k} className="flex gap-3">
                  <dt className="w-28 shrink-0 text-navy/45">{k}</dt>
                  <dd className="min-w-0 flex-1 break-words text-navy">{v || '—'}</dd>
                </div>
              ))}
            </dl>

            {lead.message && (
              <p className="mt-3 rounded-lg bg-navy-50 p-3 text-sm leading-relaxed text-navy/75">{lead.message}</p>
            )}
          </Section>

          <Section title="Quotation & site visit">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor={`kw-${lead.id}`} className={isInvalid('systemKw') ? `${label} text-red-600` : label}>
                  System size (kW){isInvalid('systemKw') && ' *'}
                </label>
                <input
                  id={`kw-${lead.id}`}
                  type="number" min="0" step="0.5" placeholder="3"
                  defaultValue={lead.systemKw || ''}
                  onBlur={(e) => {
                    const v = e.target.value === '' ? 0 : Number(e.target.value);
                    if (v !== (lead.systemKw ?? 0)) onPatch(lead.id, { systemKw: v });
                  }}
                  className={cls('systemKw')}
                />
              </div>

              <div>
                <label htmlFor={`amt-${lead.id}`} className={isInvalid('quoteAmount') ? `${label} text-red-600` : label}>
                  Quote amount (₹){isInvalid('quoteAmount') && ' *'}
                </label>
                <input
                  id={`amt-${lead.id}`}
                  type="number" min="0" step="1000" placeholder="195000"
                  defaultValue={lead.quoteAmount || ''}
                  onBlur={(e) => {
                    const v = e.target.value === '' ? 0 : Number(e.target.value);
                    if (v !== (lead.quoteAmount ?? 0)) onPatch(lead.id, { quoteAmount: v });
                  }}
                  className={cls('quoteAmount')}
                />
                {lead.quoteAmount ? (
                  <p className="mt-1 text-[11px] font-semibold text-leaf">{inr(lead.quoteAmount)}</p>
                ) : null}
              </div>

              <div>
                <label className={label}>Elec. load</label>
                <input
                  defaultValue={lead.elecLoad ?? ''} placeholder="e.g. 03"
                  onBlur={(e) => e.target.value !== (lead.elecLoad ?? '') && onPatch(lead.id, { elecLoad: e.target.value })}
                  className={field}
                />
              </div>

              <div>
                <label className={label}>Site visit date</label>
                <input
                  type="date" defaultValue={lead.visitDate ?? ''}
                  onBlur={(e) => e.target.value !== (lead.visitDate ?? '') && onPatch(lead.id, { visitDate: e.target.value })}
                  className={field}
                />
              </div>

              <div className="col-span-2">
                <label className={label}>Assigned to</label>
                <input
                  defaultValue={lead.assignedTo ?? ''} placeholder="Technician name"
                  onBlur={(e) => e.target.value !== (lead.assignedTo ?? '') && onPatch(lead.id, { assignedTo: e.target.value })}
                  className={field}
                />
              </div>
            </div>
          </Section>

          <Section title="Internal notes">
            <textarea
              defaultValue={lead.notes}
              onBlur={(e) => e.target.value !== lead.notes && onPatch(lead.id, { notes: e.target.value })}
              rows={4}
              placeholder="Site visit booked for Saturday 11am…"
              className={field}
            />
            <p className="mt-1.5 h-4 text-[11px] text-navy/40">
              {saving ? 'Saving…' : 'Saves when you click away'}
            </p>
          </Section>
        </div>

        {/* ---------- Sticky actions ---------- */}
        <footer className="shrink-0 border-t border-navy/10 bg-navy-50/60 px-6 py-4">
          {blocked && (
            <p className="mb-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800">
              <span aria-hidden="true">⚠</span>
              Add system size and quote amount to generate a quotation.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onDownload(lead)}
              disabled={busy}
              className={`rounded-full px-4 py-2 text-xs font-bold transition disabled:opacity-50 ${
                blocked
                  ? 'border border-navy/20 bg-white text-navy/60 hover:border-solar hover:text-solar'
                  : 'bg-navy text-white hover:bg-navy-700'
              }`}
            >
              {busy ? 'Preparing…' : 'Download quotation PDF'}
            </button>

            {FEATURES.emailQuotation && (
              <button
                onClick={() => onEmail(lead)}
                disabled={!lead.email || busy}
                title={lead.email ? '' : 'No email address on this lead'}
                className="rounded-full bg-leaf px-4 py-2 text-xs font-bold text-white disabled:opacity-40"
              >
                Email to customer
              </button>
            )}

            <a
              href={`https://wa.me/91${lead.phone.replace(/\D/g, '').slice(-10)}`}
              target="_blank" rel="noopener"
              className="rounded-full bg-[#25D366] px-4 py-2 text-xs font-bold text-white hover:opacity-90"
            >
              WhatsApp
            </a>

            {FEATURES.call && (
              <a href={`tel:+91${lead.phone}`} className="rounded-full bg-solar px-4 py-2 text-xs font-bold text-white">
                Call
              </a>
            )}

            <span className="ml-auto hidden text-[11px] text-navy/35 sm:block">Esc to close · ← → to move</span>
          </div>
        </footer>
      </div>

      <style>{`
        @keyframes drawer-in { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes drawer-fade { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}
