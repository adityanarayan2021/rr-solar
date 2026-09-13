import Icon from './Icon';
import TrackedLink from './TrackedLink';
import { site, waLink } from '@/lib/site';

const stats = [
  { value: '8', label: 'Solar Services' },
  { value: '24x7', label: 'Customer Support' },
  { value: '100%', label: 'Net Metering Support' },
  { value: 'MNRE', label: 'Approved Partner' },
];

export default function Hero() {
  return (
    <section id="top" className="relative overflow-hidden bg-navy text-white">
      <div className="pointer-events-none absolute -right-24 -top-24 h-[26rem] w-[26rem] rounded-full bg-solar/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-leaf/10 blur-3xl" />

      <div className="container-x relative grid gap-14 py-16 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:py-24">
        <div className="animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-solar ring-1 ring-white/15">
            <Icon name="shield" className="h-4 w-4" />
            MNRE Approved · Lucknow, Uttar Pradesh
          </span>

          <h1 className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.4rem]">
            Go Solar Today —<br />
            <span className="text-solar">Save Money</span>, <span className="text-leaf">Save Environment</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/75">
            RR Solar Solutions designs, installs and maintains rooftop, commercial and industrial solar systems across
            Lucknow and Uttar Pradesh — with subsidy and net-metering paperwork handled end to end.
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <TrackedLink event="quote_cta_click" eventParams={{ location: 'hero' }} href="#contact" className="btn-solar">
              Book Free Site Survey
            </TrackedLink>
            <TrackedLink event="whatsapp_click" eventParams={{ location: 'hero' }} href={waLink()} target="_blank" rel="noopener" className="btn-ghost">
              <Icon name="phone" className="h-4 w-4" />
              WhatsApp Us
            </TrackedLink>
          </div>

          <dl className="mt-12 grid max-w-lg grid-cols-2 gap-x-6 gap-y-7 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label}>
                <dt className="text-2xl font-extrabold text-solar">{s.value}</dt>
                <dd className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-white/60">{s.label}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative">
          <div className="rounded-3xl border border-white/15 bg-white/[0.06] p-7 shadow-2xl backdrop-blur">
            <h2 className="text-lg font-bold">Get a free rooftop assessment</h2>
            <p className="mt-2 text-sm text-white/65">
              Share your last electricity bill and we&apos;ll size the right system, estimate generation and calculate your
              subsidy — at no cost.
            </p>

            <ul className="mt-6 space-y-3.5">
              {[
                'Free site visit anywhere in Lucknow',
                'PM Surya Ghar subsidy calculation',
                'Fixed-price written quotation',
                'Discom net-metering handled by us',
              ].map((t) => (
                <li key={t} className="flex items-start gap-3 text-sm text-white/85">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-leaf text-white">
                    <Icon name="check" className="h-3.5 w-3.5" />
                  </span>
                  {t}
                </li>
              ))}
            </ul>

            <div className="mt-7 grid gap-2 border-t border-white/15 pt-6 text-sm">
              {site.phones.map((p) => (
                <TrackedLink key={p} event="call_click" eventParams={{ location: 'hero' }} href={`tel:+91${p}`} className="flex items-center gap-3 font-bold text-white hover:text-solar">
                  <Icon name="phone" className="h-4 w-4 text-solar" />
                  +91 {p}
                </TrackedLink>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="h-1.5 w-full bg-gradient-to-r from-solar via-solar/40 to-leaf" />
    </section>
  );
}
