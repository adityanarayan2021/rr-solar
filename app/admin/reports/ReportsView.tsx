'use client';

import { BarList, Donut, TrendChart } from '@/components/Charts';
import { inr } from '@/lib/lead-types';
import type { Report } from '@/lib/server/reports.service';
import AdminNav from '@/components/AdminNav';

function monthOptions(count = 18) {
  const out: { value: string; label: string }[] = [];
  const d = new Date();
  for (let i = 0; i < count; i++) {
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth() + 1;
    out.push({
      value: `${y}-${String(m).padStart(2, '0')}`,
      label: new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-IN', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      }),
    });
    d.setUTCMonth(d.getUTCMonth() - 1);
  }
  return out;
}

function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="rounded-2xl border border-navy/10 bg-white p-5">
      <p className="text-[11px] font-bold uppercase tracking-wider text-navy/45">{label}</p>
      <p className={`mt-2 text-2xl font-extrabold ${accent ?? 'text-navy'}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-navy/50">{sub}</p>}
    </div>
  );
}

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-navy/10 bg-white p-6">
      <div className="mb-5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-navy">{title}</h2>
        {hint && <p className="mt-1 text-xs text-navy/45">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

export default function ReportsView({ report, selected }: { report: Report; selected: string }) {
  const t = report.totals;

  return (
    <main className="min-h-screen bg-navy-50/60">
      <AdminNav active="/admin/reports" title="Monthly Report" subtitle={report.range.label}>
        <select
          defaultValue={selected}
          onChange={(e) => {
            window.location.href = `/admin/reports?m=${e.target.value}`;
          }}
          className="rounded-full border border-navy/15 bg-white px-4 py-2 text-xs font-bold text-navy outline-none focus:border-solar"
        >
          {monthOptions().map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <a
          href={`/api/admin/reports/export?m=${selected}`}
          className="rounded-full bg-leaf px-4 py-2 text-xs font-bold text-white hover:opacity-90"
        >
          Download Excel
        </a>
      </AdminNav>

      <div className="container-x space-y-5 py-7">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Enquiries" value={String(t.leads)} sub={`${t.open} still open`} />
          <Stat
            label="Conversion rate"
            value={`${t.conversionRate}%`}
            sub={`${t.won} won · ${t.lost} lost`}
            accent="text-leaf"
          />
          <Stat label="Closed value" value={inr(t.closedValue)} sub={`Avg deal ${inr(t.avgDealValue)}`} accent="text-leaf" />
          <Stat label="Open pipeline" value={inr(t.pipelineValue)} sub={`${t.totalKw} kW sold`} accent="text-solar-600" />
        </div>

        <Card
          title="Trend — last 12 months"
          hint="Orange = all enquiries · Green = won. Widening gap means leads are arriving but not closing."
        >
          <TrendChart data={report.monthlyTrend} />
        </Card>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card title="Pipeline status" hint="Where this month's enquiries currently sit">
            <Donut data={report.byStatus} />
          </Card>

          <Card title="Lead source" hint="First-touch attribution — which channel found the customer">
            <BarList
              data={report.bySource}
              valueLabel={(d) => `${d.count} · ${d.won ?? 0} won`}
            />
          </Card>

          <Card title="Service mix" hint="What people are actually asking for">
            <BarList data={report.byService} valueLabel={(d) => `${d.count} · ${d.won ?? 0} won`} />
          </Card>

          <Card title="Top locations" hint="Useful for planning site visits and local ads">
            <BarList data={report.byCity} />
          </Card>
        </div>

        <p className="pb-6 text-center text-xs text-navy/40">
          Values are based on the quotation amount recorded against each lead in the dashboard.
        </p>
      </div>
    </main>
  );
}
