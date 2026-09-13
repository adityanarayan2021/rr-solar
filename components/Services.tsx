import Icon from './Icon';
import { services } from '@/lib/site';

export default function Services() {
  return (
    <section id="services" className="bg-navy-50/60 py-20 sm:py-24">
      <div className="container-x">
        <div className="max-w-2xl">
          <span className="eyebrow">Our Services</span>
          <h2 className="h2 mt-4 text-navy">Every solar need, under one roof</h2>
          <p className="mt-4 text-base leading-relaxed text-navy/65">
            From a 2 kW home system to a turnkey industrial plant — we handle design, supply, installation, approvals and
            long-term maintenance.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((s) => (
            <article
              key={s.slug}
              className="group relative overflow-hidden rounded-2xl border border-navy/10 bg-white p-6 transition hover:-translate-y-1 hover:border-solar/40 hover:shadow-xl hover:shadow-navy/5"
            >
              <span className="grid h-14 w-14 place-items-center rounded-xl bg-navy text-solar transition group-hover:bg-solar group-hover:text-white">
                <Icon name={s.icon} className="h-7 w-7" />
              </span>
              <h3 className="mt-5 text-base font-bold leading-snug text-navy">{s.title}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-navy/60">{s.blurb}</p>
              <a
                href="#contact"
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-solar-600 opacity-0 transition group-hover:opacity-100"
              >
                Enquire
                <svg viewBox="0 0 24 24" className="h-4 w-4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round">
                  <path d="M5 12h13M13 6l6 6-6 6" />
                </svg>
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
