import Logo from './Logo';
import { services, site } from '@/lib/site';

export default function Footer() {
  return (
    <footer className="bg-navy-900 pt-16 text-white/70">
      <div className="container-x grid gap-10 pb-12 md:grid-cols-3">
        <div>
          <Logo light />
          <p className="mt-5 max-w-sm text-sm leading-relaxed">
            MNRE and UPNEDA certified solar EPC based in Lucknow, delivering rooftop, commercial and industrial solar across Uttar
            Pradesh.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-bold uppercase tracking-widest text-solar">Services</h4>
          <ul className="mt-5 grid gap-2.5 text-sm sm:grid-cols-2">
            {services.map((s) => (
              <li key={s.slug}>
                <a href="#services" className="hover:text-white">
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-bold uppercase tracking-widest text-solar">Contact</h4>
          <ul className="mt-5 space-y-2.5 text-sm">
            {site.phones.map((p) => (
              <li key={p}>
                <a href={`tel:+91${p}`} className="hover:text-white">
                  +91 {p}
                </a>
              </li>
            ))}
            <li>
              <a href={`mailto:${site.email}`} className="break-all hover:text-white">
                {site.email}
              </a>
            </li>
            <li className="leading-relaxed">
              {site.address.street}, {site.address.city} – {site.address.postalCode}, {site.address.region}
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 py-6 text-center text-xs">
        © {new Date().getFullYear()} {site.name}. All rights reserved.
      </div>
    </footer>
  );
}
