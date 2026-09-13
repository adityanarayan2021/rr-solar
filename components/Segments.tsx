import Icon from './Icon';
import { segments } from '@/lib/site';

export default function Segments() {
  return (
    <section id="segments" className="bg-navy py-20 text-white sm:py-24">
      <div className="container-x">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-solar">
              Who We Serve
            </span>
            <h2 className="h2 mt-4">Residential, commercial and industrial</h2>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-white/60">
            Different tariffs, different roofs, different approval routes. Each segment gets a design and a discom
            strategy built for it.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {segments.map((s) => (
            <div
              key={s.title}
              className="rounded-2xl border border-white/12 bg-white/[0.05] p-8 transition hover:border-solar/50 hover:bg-white/[0.09]"
            >
              <span className="grid h-14 w-14 place-items-center rounded-xl bg-solar text-white">
                <Icon name={s.icon} className="h-7 w-7" />
              </span>
              <h3 className="mt-6 text-xl font-bold">{s.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-white/65">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
