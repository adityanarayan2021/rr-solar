import { mediaUrl, type Project } from '@/lib/project-types';

/**
 * Public gallery. Renders nothing when there are no published projects, so the
 * homepage never shows an empty section before the first photo is uploaded.
 */
export default function Projects({ projects }: { projects: Project[] }) {
  if (projects.length === 0) return null;

  const locations = [...new Set(projects.map((p) => p.location.split(',').pop()?.trim()).filter(Boolean))];
  const totalKw = projects.reduce((sum, p) => sum + (p.capacityKw ?? 0), 0);

  return (
    <section id="projects" className="py-20 sm:py-24">
      <div className="container-x">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <span className="eyebrow">Our Work</span>
            <h2 className="h2 mt-4 text-navy">Installations we&apos;ve completed</h2>
            <p className="mt-4 text-base leading-relaxed text-navy/65">
              Real systems on real rooftops
              {locations.length > 0 && <> across {locations.slice(0, 4).join(', ')}</>}. Every photo below is our own
              work, not stock imagery.
            </p>
          </div>

          {totalKw > 0 && (
            <div className="shrink-0 rounded-2xl bg-navy px-6 py-4 text-white">
              <p className="text-3xl font-extrabold text-solar">{Math.round(totalKw)} kW</p>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-white/60">
                shown here
              </p>
            </div>
          )}
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <figure
              key={p.id}
              className="group overflow-hidden rounded-2xl border border-navy/10 bg-white transition hover:-translate-y-1 hover:shadow-xl hover:shadow-navy/5"
            >
              <div className="relative overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mediaUrl(p.imageId)}
                  alt={p.alt}
                  width={p.width}
                  height={p.height}
                  loading="lazy"
                  className="h-56 w-full object-cover transition duration-500 group-hover:scale-105"
                />
                {p.capacityKw ? (
                  <span className="absolute right-3 top-3 rounded-full bg-solar px-3 py-1 text-xs font-bold text-white shadow-lg">
                    {p.capacityKw} kW
                  </span>
                ) : null}
              </div>

              <figcaption className="p-5">
                <h3 className="text-[15px] font-bold leading-snug text-navy">{p.title}</h3>

                <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-solar-600">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z" />
                    <circle cx="12" cy="10" r="2.6" />
                  </svg>
                  {p.location}
                </p>

                {(p.serviceType || p.completedOn) && (
                  <p className="mt-2 text-xs text-navy/50">
                    {[p.serviceType, p.completedOn
                      ? new Date(`${p.completedOn}-01`).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
                      : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                )}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
