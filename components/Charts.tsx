'use client';

/**
 * Hand-rolled SVG charts. No charting library: this keeps the admin bundle small
 * and the visuals on-brand. Each chart degrades to an empty state rather than
 * throwing when there is no data yet.
 */

const NAVY = '#0E2A5C';
const SOLAR = '#F5911E';
const LEAF = '#2E9E4F';
const PALETTE = [SOLAR, NAVY, LEAF, '#7C3AED', '#0891B2', '#DB2777', '#65A30D', '#B45309'];

export function Empty({ label = 'No data for this period' }: { label?: string }) {
  return <p className="grid h-40 place-items-center text-sm text-navy/40">{label}</p>;
}

/** Grouped trend: total leads vs. won, over the trailing months. */
export function TrendChart({ data }: { data: { month: string; leads: number; won: number }[] }) {
  if (!data.length) return <Empty />;

  const W = 720;
  const H = 220;
  const pad = { l: 34, r: 12, t: 12, b: 28 };
  const max = Math.max(...data.map((d) => d.leads), 1);
  const bw = (W - pad.l - pad.r) / data.length;
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / max);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      className="w-full"
      style={{ maxHeight: 260 }}
      role="img"
      aria-label="Monthly lead trend"
    >
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line x1={pad.l} x2={W - pad.r} y1={y(max * f)} y2={y(max * f)} stroke="#0E2A5C" strokeOpacity={0.08} />
          <text x={4} y={y(max * f) + 4} fontSize={10} fill={NAVY} fillOpacity={0.45}>
            {Math.round(max * f)}
          </text>
        </g>
      ))}

      {data.map((d, i) => {
        const x = pad.l + i * bw;
        const inner = Math.min(bw * 0.28, 16);
        return (
          <g key={d.month}>
            <rect x={x + bw / 2 - inner - 2} y={y(d.leads)} width={inner} height={H - pad.b - y(d.leads)} rx={2} fill={SOLAR} />
            <rect x={x + bw / 2 + 2} y={y(d.won)} width={inner} height={H - pad.b - y(d.won)} rx={2} fill={LEAF} />
            <text x={x + bw / 2} y={H - 9} fontSize={9.5} textAnchor="middle" fill={NAVY} fillOpacity={0.5}>
              {d.month.slice(5)}/{d.month.slice(2, 4)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Horizontal ranked bars — used for service mix, cities and sources. */
export function BarList({
  data,
  valueLabel,
}: {
  data: { key: string; count: number; won?: number }[];
  valueLabel?: (d: { key: string; count: number; won?: number }) => string;
}) {
  if (!data.length) return <Empty />;
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <ul className="space-y-3">
      {data.map((d, i) => (
        <li key={d.key}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-semibold text-navy">{d.key}</span>
            <span className="shrink-0 text-xs font-bold text-navy/55">
              {valueLabel ? valueLabel(d) : d.count}
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-navy/8">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${(d.count / max) * 100}%`, background: PALETTE[i % PALETTE.length] }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Donut for the status split. */
export function Donut({ data }: { data: { key: string; count: number }[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (!total) return <Empty />;

  const R = 60;
  const C = 2 * Math.PI * R;
  let offset = 0;

  return (
    <div className="flex flex-wrap items-center gap-7">
      <svg viewBox="0 0 160 160" className="h-40 w-40 shrink-0 -rotate-90" role="img" aria-label="Lead status split">
        {data.map((d, i) => {
          const len = (d.count / total) * C;
          const el = (
            <circle
              key={d.key}
              cx={80}
              cy={80}
              r={R}
              fill="none"
              stroke={PALETTE[i % PALETTE.length]}
              strokeWidth={24}
              strokeDasharray={`${len} ${C - len}`}
              strokeDashoffset={-offset}
            />
          );
          offset += len;
          return el;
        })}
      </svg>

      <ul className="space-y-2 text-sm">
        {data.map((d, i) => (
          <li key={d.key} className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
            <span className="font-semibold text-navy">{d.key}</span>
            <span className="text-navy/50">
              {d.count} · {Math.round((d.count / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
