import { faqs } from '@/lib/site';

export default function Faq() {
  return (
    <section id="faq" className="bg-navy-50/60 py-20 sm:py-24">
      <div className="container-x grid gap-12 lg:grid-cols-[.85fr_1.15fr] lg:items-start">
        <div className="lg:sticky lg:top-28">
          <span className="eyebrow">FAQs</span>
          <h2 className="h2 mt-4 text-navy">Questions people ask before going solar</h2>
          <p className="mt-4 text-sm leading-relaxed text-navy/60">
            Still unsure about something? Call us on{' '}
            <a href="tel:+919580446571" className="font-bold text-solar-600 hover:underline">
              +91 9580446571
            </a>{' '}
            — no obligation.
          </p>
        </div>

        <div className="divide-y divide-navy/10 overflow-hidden rounded-2xl border border-navy/10 bg-white">
          {faqs.map((f) => (
            <details key={f.q} className="group px-6 py-5 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer items-start justify-between gap-4 text-[15px] font-bold text-navy">
                {f.q}
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-navy-50 text-solar transition group-open:rotate-45">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" stroke="currentColor" strokeWidth="2.4" fill="none" strokeLinecap="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </span>
              </summary>
              <p className="mt-3 pr-10 text-sm leading-relaxed text-navy/65">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
