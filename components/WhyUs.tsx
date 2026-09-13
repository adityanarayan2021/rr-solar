import Icon from './Icon';
import { whyUs } from '@/lib/site';

export default function WhyUs() {
  return (
    <section id="why-us" className="py-20 sm:py-24">
      <div className="container-x grid gap-14 lg:grid-cols-[.9fr_1.1fr] lg:items-start">
        <div className="lg:sticky lg:top-28">
          <span className="eyebrow">Why Choose Us</span>
          <h2 className="h2 mt-4 text-navy">Built on delivery, not promises</h2>
          <p className="mt-4 text-base leading-relaxed text-navy/65">
            Solar is a 25-year asset. We build it with equipment, workmanship and after-sales service that will still be
            performing in year twenty.
          </p>
          <a href="#contact" className="btn-navy mt-8">
            Talk to an Engineer
          </a>
        </div>

        <ul className="grid gap-4 sm:grid-cols-2">
          {whyUs.map((w) => (
            <li key={w.title} className="rounded-2xl border border-navy/10 bg-white p-6 shadow-sm">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-leaf/12 text-leaf">
                <Icon name="check" className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-[15px] font-bold text-navy">{w.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-navy/60">{w.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
