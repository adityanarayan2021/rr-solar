'use client';

import { useMemo, useState } from 'react';
import type { Lead } from '@/lib/lead-types';
import { FEATURES } from '@/lib/features';
import AdminNav from '@/components/AdminNav';

const dayLabel = (d: string, today: string) => {
  const date = new Date(`${d}T00:00:00`);
  const t = new Date(`${today}T00:00:00`);
  const diff = Math.round((date.getTime() - t.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};

export default function VisitsView({ visits, today }: { visits: Lead[]; today: string }) {
  const [showPast, setShowPast] = useState(false);

  const { overdue, upcoming } = useMemo(() => {
    const o: Lead[] = [];
    const u: Lead[] = [];
    for (const v of visits) {
      if (!v.visitDate) continue;
      // Overdue = date has passed and the lead hasn't been won yet.
      if (v.visitDate < today && v.status !== 'Won') o.push(v);
      else if (v.visitDate >= today) u.push(v);
    }
    return { overdue: o.reverse(), upcoming: u };
  }, [visits, today]);

  const grouped = useMemo(() => {
    const map = new Map<string, Lead[]>();
    (showPast ? [...overdue].reverse().concat(upcoming) : upcoming).forEach((v) => {
      const k = v.visitDate as string;
      map.set(k, [...(map.get(k) ?? []), v]);
    });
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [upcoming, overdue, showPast]);

  const Row = ({ v, stale }: { v: Lead; stale?: boolean }) => (
    <div className={`flex flex-wrap items-center gap-3 rounded-xl border p-4 ${stale ? 'border-red-200 bg-red-50/40' : 'border-navy/10 bg-white'}`}>
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold text-navy">{v.name}</p>
        <p className="mt-0.5 truncate text-xs text-navy/55">
          {v.city ?? 'Location not given'} · {v.service ?? 'Service not specified'}
          {v.systemKw ? ` · ${v.systemKw} kW` : ''}
        </p>
      </div>

      <span className="rounded-full bg-navy-50 px-3 py-1 text-[11px] font-bold text-navy/70">
        {v.assignedTo?.trim() || 'Unassigned'}
      </span>
      <span className="rounded-full bg-solar/15 px-3 py-1 text-[11px] font-bold text-solar-600">{v.status}</span>

      <div className="flex gap-2">
        {FEATURES.call && (
          <a href={`tel:+91${v.phone}`} className="rounded-full bg-solar px-3.5 py-1.5 text-xs font-bold text-white">Call</a>
        )}
        <a
          href={`https://wa.me/91${v.phone.replace(/\D/g, '').slice(-10)}`}
          target="_blank"
          rel="noopener"
          className="rounded-full bg-[#25D366] px-3.5 py-1.5 text-xs font-bold text-white"
        >
          WhatsApp
        </a>
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-navy-50/60">
      <AdminNav
        active="/admin/visits"
        title="Site Visits"
        subtitle={
          <>
            {upcoming.length} scheduled
            {overdue.length > 0 && <span className="text-red-600"> · {overdue.length} overdue</span>}
          </>
        }
      />

      <div className="container-x space-y-6 py-7">
        {overdue.length > 0 && (
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-red-600">
                Overdue — {overdue.length}
              </h2>
              <button onClick={() => setShowPast((v) => !v)} className="text-xs font-bold text-navy/50 hover:text-solar">
                {showPast ? 'Hide from timeline' : 'Show in timeline'}
              </button>
            </div>
            <p className="mb-3 text-xs text-navy/50">
              Visit date has passed and the lead isn&apos;t marked Won. Either update the status or reschedule.
            </p>
            <div className="space-y-2">
              {overdue.map((v) => <Row key={v.id} v={v} stale />)}
            </div>
          </section>
        )}

        {grouped.length === 0 ? (
          <div className="rounded-2xl border border-navy/10 bg-white p-12 text-center">
            <p className="text-sm text-navy/50">No site visits scheduled.</p>
            <p className="mt-2 text-xs text-navy/40">
              Set a visit date on any lead in the dashboard and it will appear here.
            </p>
          </div>
        ) : (
          grouped.map(([date, rows]) => (
            <section key={date}>
              <div className="mb-3 flex items-baseline gap-3">
                <h2 className="text-sm font-bold uppercase tracking-wider text-navy">{dayLabel(date, today)}</h2>
                <span className="text-xs text-navy/40">{rows.length} visit{rows.length > 1 ? 's' : ''}</span>
              </div>
              <div className="space-y-2">
                {rows.map((v) => <Row key={v.id} v={v} stale={date < today && v.status !== 'Won'} />)}
              </div>
            </section>
          ))
        )}
      </div>
    </main>
  );
}
