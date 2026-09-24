'use client';

import { Fragment, useMemo, useState } from 'react';
import { LEAD_STATUSES, inr, type Lead, type LeadStatus } from '@/lib/lead-types';
import { FEATURES } from '@/lib/features';
import AdminNav from '@/components/AdminNav';
import Toast, { type ToastMessage } from '@/components/Toast';
import LeadDrawer from './LeadDrawer';

const statusStyles: Record<string, string> = {
  New: 'bg-solar/15 text-solar-600 ring-solar/30',
  Contacted: 'bg-blue-50 text-blue-700 ring-blue-200',
  'Visit Booked': 'bg-amber-50 text-amber-700 ring-amber-200',
  Quoted: 'bg-violet-50 text-violet-700 ring-violet-200',
  Won: 'bg-leaf/15 text-leaf ring-leaf/30',
  Lost: 'bg-slate-100 text-slate-500 ring-slate-200',
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

type Patch = Partial<
  Pick<Lead, 'status' | 'notes' | 'systemKw' | 'quoteAmount' | 'visitDate' | 'assignedTo' | 'elecLoad'>
>;

export default function LeadsTable({
  initialLeads,
  counts,
}: {
  initialLeads: Lead[];
  counts: Record<string, number>;
}) {
  const [leads, setLeads] = useState(initialLeads);
  const [filter, setFilter] = useState<string>('All');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [quoting, setQuoting] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage>(null);
  const [invalid, setInvalid] = useState<{ id: string; fields: ('systemKw' | 'quoteAmount')[] } | null>(null);


  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return leads.filter((l) => {
      if (filter !== 'All' && l.status !== filter) return false;
      if (!needle) return true;
      return [l.name, l.phone, l.email, l.city, l.service].some((v) => v?.toLowerCase().includes(needle));
    });
  }, [leads, filter, q]);

  // The drawer reads from the live `visible` list rather than a snapshot, so
  // edits and status changes appear in it immediately.
  const openIndex = open ? visible.findIndex((l) => l.id === open) : -1;
  const openLead = openIndex >= 0 ? visible[openIndex] : null;

  async function patch(id: string, body: Patch) {
    // Clear the red highlight as soon as the value that caused it is supplied.
    if (invalid?.id === id) {
      const stillMissing = invalid.fields.filter((fld) => !body[fld]);
      setInvalid(stillMissing.length ? { id, fields: stillMissing } : null);
      if (stillMissing.length === 0) setToast(null);
    }
    setSaving(id);
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...body } : l)));
    await fetch(`/api/admin/leads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => {});
    setSaving(null);
  }

  /** Missing data that would make the quotation meaningless. */
  function missingQuotationFields(l: Lead): ('systemKw' | 'quoteAmount')[] {
    const out: ('systemKw' | 'quoteAmount')[] = [];
    if (!l.systemKw) out.push('systemKw');
    if (!l.quoteAmount) out.push('quoteAmount');
    return out;
  }

  function quotationBlockers(l: Lead): string | null {
    const labels: Record<string, string> = { systemKw: 'system size (kW)', quoteAmount: 'quote amount' };
    const missing = missingQuotationFields(l).map((k) => labels[k]);
    return missing.length ? `Add ${missing.join(' and ')} below, then try again.` : null;
  }

  /**
   * Flags the offending inputs and moves focus to the first one. Telling
   * someone what is missing is less useful than showing them where it goes.
   */
  function flagMissing(l: Lead): boolean {
    const missing = missingQuotationFields(l);
    if (missing.length === 0) return false;

    setInvalid({ id: l.id, fields: missing });
    setToast({ kind: 'err', text: quotationBlockers(l) as string });

    requestAnimationFrame(() => {
      const el = document.getElementById(`${missing[0]}-${l.id}`);
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      (el as HTMLInputElement | null)?.focus();
    });
    return true;
  }

  const isInvalid = (l: Lead, f: 'systemKw' | 'quoteAmount') =>
    invalid?.id === l.id && invalid.fields.includes(f);

  /** Red ring while a required value is missing, normal styling once filled. */
  const fieldCls = (l: Lead, f: 'systemKw' | 'quoteAmount') =>
    isInvalid(l, f)
      ? 'w-full rounded-lg border-2 border-red-400 bg-red-50 px-3 py-2 text-sm outline-none ring-2 ring-red-200'
      : field;

  /**
   * Fetches the PDF rather than linking straight to it, so a validation error
   * surfaces as a message in the UI instead of raw JSON in a new browser tab.
   */
  async function downloadQuotation(l: Lead) {
    if (flagMissing(l)) return;
    setQuoting(l.id);
    setToast(null);
    try {
      const res = await fetch(`/api/admin/leads/${l.id}/quotation`);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? 'Could not generate the quotation.');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Quotation-${l.name.replace(/[^\w]+/g, '-')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setToast({ kind: 'err', text: err instanceof Error ? err.message : 'Could not generate the quotation.' });
    } finally {
      setQuoting(null);
    }
  }

  async function emailQuotation(l: Lead) {
    if (flagMissing(l)) return;
    if (!confirm(`Email this quotation to ${l.email}?`)) return;
    setQuoting(l.id);
    try {
      const res = await fetch(`/api/admin/leads/${l.id}/quotation`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to send.');
      setLeads((prev) => prev.map((x) => (x.id === l.id ? { ...x, status: 'Quoted' } : x)));
      setToast({ kind: 'ok', text: json.message });
    } catch (e) {
      setToast({ kind: 'err', text: e instanceof Error ? e.message : 'Failed to send.' });
    } finally {
      setQuoting(null);
    }
  }

  function exportCsv() {
    const cols = ['createdAt', 'name', 'phone', 'email', 'city', 'service', 'bill', 'source', 'status', 'systemKw', 'quoteAmount', 'visitDate', 'assignedTo', 'message', 'notes'];
    const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [cols.join(','), ...visible.map((l) => cols.map((c) => escape(l[c as keyof Lead])).join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `rr-solar-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const tabs = ['All', ...LEAD_STATUSES];
  const field =
    'w-full rounded-lg border border-navy/15 bg-white px-3 py-2 text-sm outline-none focus:border-solar focus:ring-2 focus:ring-solar/20';

  return (
    <main className="min-h-screen bg-navy-50/60">
      <AdminNav active="/admin" title="Website Leads" subtitle={`${leads.length} total enquiries`}>
        <button onClick={exportCsv} className="rounded-full bg-solar px-4 py-2 text-xs font-bold text-white hover:bg-solar-600">
          Export CSV
        </button>
      </AdminNav>

      <Toast message={toast} onDismiss={() => setToast(null)} />

      {openLead && (
        <LeadDrawer
          lead={openLead}
          position={{ index: openIndex, total: visible.length }}
          busy={quoting === openLead.id}
          saving={saving === openLead.id}
          invalidFields={invalid?.id === openLead.id ? invalid.fields : []}
          onClose={() => setOpen(null)}
          onPatch={patch}
          onDownload={downloadQuotation}
          onEmail={emailQuotation}
          onPrev={openIndex > 0 ? () => setOpen(visible[openIndex - 1].id) : undefined}
          onNext={openIndex < visible.length - 1 ? () => setOpen(visible[openIndex + 1].id) : undefined}
        />
      )}

      <div className="container-x py-7">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-1.5">
            {tabs.map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
                  filter === t ? 'bg-navy text-white' : 'bg-white text-navy/60 hover:text-navy'
                }`}
              >
                {t}
                {t !== 'All' && counts[t] ? <span className="ml-1.5 opacity-60">{counts[t]}</span> : null}
              </button>
            ))}
          </div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, phone, city…"
            className="ml-auto w-full rounded-full border border-navy/15 bg-white px-4 py-2 text-sm outline-none focus:border-solar sm:w-72"
          />
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-navy/10 bg-white">
          {visible.length === 0 ? (
            <p className="p-12 text-center text-sm text-navy/50">No leads match this view yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-navy/10 bg-navy-50/60 text-[11px] uppercase tracking-wider text-navy/50">
                <tr>
                  <th className="px-5 py-3 font-bold">Received</th>
                  <th className="px-5 py-3 font-bold">Name</th>
                  <th className="px-5 py-3 font-bold">Phone</th>
                  <th className="hidden px-5 py-3 font-bold lg:table-cell">Service</th>
                  <th className="hidden px-5 py-3 font-bold xl:table-cell">Source</th>
                  <th className="hidden px-5 py-3 font-bold sm:table-cell">Quote</th>
                  <th className="px-5 py-3 font-bold">Status</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((l) => (
                  <tr
                    key={l.id}
                    onClick={() => setOpen(l.id)}
                    className="cursor-pointer border-b border-navy/5 transition hover:bg-navy-50/60"
                  >
                      <td className="whitespace-nowrap px-5 py-3.5 text-xs text-navy/50">{fmt(l.createdAt)}</td>
                      <td className="px-5 py-3.5 font-semibold text-navy">{l.name}</td>
                      <td className="whitespace-nowrap px-5 py-3.5">
                        {FEATURES.call ? (
                          <a href={`tel:+91${l.phone}`} onClick={(e) => e.stopPropagation()} className="font-medium text-navy hover:text-solar">
                            {l.phone}
                          </a>
                        ) : (
                          <span className="font-medium text-navy">{l.phone}</span>
                        )}
                      </td>
                      <td className="hidden px-5 py-3.5 text-navy/60 lg:table-cell">{l.service ?? '—'}</td>
                      <td className="hidden px-5 py-3.5 text-xs text-navy/50 xl:table-cell">{l.source ?? '—'}</td>
                      <td className="hidden whitespace-nowrap px-5 py-3.5 font-semibold text-navy/70 sm:table-cell">
                        {l.quoteAmount ? inr(l.quoteAmount) : '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${statusStyles[l.status]}`}>
                          {l.status}
                        </span>
                      </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  );
}
