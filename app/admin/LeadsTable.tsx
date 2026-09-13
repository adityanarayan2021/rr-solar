'use client';

import { Fragment, useMemo, useState } from 'react';
import { LEAD_STATUSES, inr, type Lead, type LeadStatus } from '@/lib/lead-types';
import { FEATURES } from '@/lib/features';
import AdminNav from '@/components/AdminNav';

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

type Patch = Partial<Pick<Lead, 'status' | 'notes' | 'systemKw' | 'quoteAmount' | 'visitDate' | 'assignedTo'>>;

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
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return leads.filter((l) => {
      if (filter !== 'All' && l.status !== filter) return false;
      if (!needle) return true;
      return [l.name, l.phone, l.email, l.city, l.service].some((v) => v?.toLowerCase().includes(needle));
    });
  }, [leads, filter, q]);

  async function patch(id: string, body: Patch) {
    setSaving(id);
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...body } : l)));
    await fetch(`/api/admin/leads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => {});
    setSaving(null);
  }

  async function emailQuotation(l: Lead) {
    if (!l.systemKw || !l.quoteAmount) {
      setToast({ kind: 'err', text: 'Add system size and quote amount first.' });
      return;
    }
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

      {toast && (
        <div className="container-x pt-4">
          <div
            role="status"
            className={`flex items-center justify-between gap-4 rounded-xl px-4 py-3 text-sm font-medium ${
              toast.kind === 'ok' ? 'bg-leaf/10 text-leaf' : 'bg-red-50 text-red-600'
            }`}
          >
            {toast.text}
            <button onClick={() => setToast(null)} className="text-xs font-bold opacity-60 hover:opacity-100">
              Dismiss
            </button>
          </div>
        </div>
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
                  <Fragment key={l.id}>
                    <tr
                      onClick={() => setOpen(open === l.id ? null : l.id)}
                      className="cursor-pointer border-b border-navy/5 transition hover:bg-navy-50/50"
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

                    {open === l.id && (
                      <tr className="border-b border-navy/5 bg-navy-50/40">
                        <td colSpan={7} className="px-5 py-5">
                          <div className="grid gap-6 lg:grid-cols-3">
                            <div className="space-y-2 text-sm">
                              <p><span className="text-navy/50">Email:</span> {l.email ?? '—'}</p>
                              <p><span className="text-navy/50">City:</span> {l.city ?? '—'}</p>
                              <p><span className="text-navy/50">Monthly bill:</span> {l.bill ?? '—'}</p>
                              <p><span className="text-navy/50">Message:</span> {l.message ?? '—'}</p>
                              <p className="text-xs text-navy/40">
                                Source: {l.source ?? '—'}
                                {l.utmCampaign ? ` · campaign: ${l.utmCampaign}` : ''}
                              </p>
                              <div className="flex gap-2 pt-2">
                                {FEATURES.call && (
                                  <a href={`tel:+91${l.phone}`} className="rounded-full bg-solar px-4 py-1.5 text-xs font-bold text-white">Call</a>
                                )}
                                <a href={`https://wa.me/91${l.phone.replace(/\D/g, '').slice(-10)}`} target="_blank" rel="noopener" className="rounded-full bg-[#25D366] px-4 py-1.5 text-xs font-bold text-white">WhatsApp</a>
                              </div>
                            </div>

                            <div>
                              <label className="text-[11px] font-bold uppercase tracking-wider text-navy/50">Status</label>
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {LEAD_STATUSES.map((s) => (
                                  <button
                                    key={s}
                                    onClick={() => patch(l.id, { status: s as LeadStatus })}
                                    className={`rounded-full px-3 py-1.5 text-xs font-bold ring-1 transition ${
                                      l.status === s ? statusStyles[s] : 'bg-white text-navy/50 ring-navy/10 hover:ring-solar/40'
                                    }`}
                                  >
                                    {s}
                                  </button>
                                ))}
                              </div>

                              <label className="mt-4 block text-[11px] font-bold uppercase tracking-wider text-navy/50">
                                Internal notes
                              </label>
                              <textarea
                                defaultValue={l.notes}
                                onBlur={(e) => e.target.value !== l.notes && patch(l.id, { notes: e.target.value })}
                                rows={3}
                                placeholder="Site visit booked for Saturday 11am…"
                                className={`mt-2 ${field}`}
                              />
                              {saving === l.id && <p className="mt-1 text-xs text-navy/40">Saving…</p>}
                            </div>

                            <div className="space-y-3">
                              <p className="text-[11px] font-bold uppercase tracking-wider text-navy/50">
                                Quotation &amp; site visit
                              </p>
                              <div className="grid grid-cols-2 gap-3">
                                <label className="block">
                                  <span className="text-xs text-navy/50">System size (kW)</span>
                                  <input
                                    type="number" min="0" step="0.5" defaultValue={l.systemKw ?? ''}
                                    onBlur={(e) => e.target.value !== String(l.systemKw ?? '') && patch(l.id, { systemKw: Number(e.target.value) })}
                                    className={`mt-1 ${field}`}
                                  />
                                </label>
                                <label className="block">
                                  <span className="text-xs text-navy/50">Quote amount (₹)</span>
                                  <input
                                    type="number" min="0" step="1000" defaultValue={l.quoteAmount ?? ''}
                                    onBlur={(e) => e.target.value !== String(l.quoteAmount ?? '') && patch(l.id, { quoteAmount: Number(e.target.value) })}
                                    className={`mt-1 ${field}`}
                                  />
                                </label>
                                <label className="block">
                                  <span className="text-xs text-navy/50">Site visit date</span>
                                  <input
                                    type="date" defaultValue={l.visitDate ?? ''}
                                    onBlur={(e) => e.target.value !== (l.visitDate ?? '') && patch(l.id, { visitDate: e.target.value })}
                                    className={`mt-1 ${field}`}
                                  />
                                </label>
                                <label className="block">
                                  <span className="text-xs text-navy/50">Assigned to</span>
                                  <input
                                    defaultValue={l.assignedTo ?? ''} placeholder="Technician name"
                                    onBlur={(e) => e.target.value !== (l.assignedTo ?? '') && patch(l.id, { assignedTo: e.target.value })}
                                    className={`mt-1 ${field}`}
                                  />
                                </label>
                              </div>
                              <p className="text-[11px] leading-relaxed text-navy/40">
                                Quote amount drives the pipeline and closed-value figures in Reports. Leave blank until
                                you have actually quoted.
                              </p>

                              <div className="border-t border-navy/10 pt-3">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-navy/50">Quotation</p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  <a
                                    href={`/api/admin/leads/${l.id}/quotation`}
                                    className="rounded-full border border-navy/20 px-3.5 py-1.5 text-xs font-bold text-navy hover:border-solar hover:text-solar"
                                  >
                                    Download PDF
                                  </a>
                                  {FEATURES.emailQuotation && (
                                    <button
                                      onClick={() => emailQuotation(l)}
                                      disabled={!l.email || quoting === l.id}
                                      title={l.email ? '' : 'No email address on this lead'}
                                      className="rounded-full bg-leaf px-3.5 py-1.5 text-xs font-bold text-white disabled:opacity-40"
                                    >
                                      {quoting === l.id ? 'Sending…' : 'Email to customer'}
                                    </button>
                                  )}
                                </div>
                                <p className="mt-2 text-[11px] text-navy/40">
                                  Subsidy is applied automatically for rooftop and residential enquiries.
                                  {!FEATURES.emailQuotation && ' Download the PDF and send it yourself for now.'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  );
}
