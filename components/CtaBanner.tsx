import { waLink } from '@/lib/site';
import TrackedLink from './TrackedLink';

export default function CtaBanner() {
  return (
    <section className="container-x pb-4">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-solar to-solar-600 px-8 py-12 text-center text-white sm:px-14">
        <div className="pointer-events-none absolute -left-16 -top-16 h-52 w-52 rounded-full bg-white/15" />
        <div className="pointer-events-none absolute -bottom-20 -right-10 h-56 w-56 rounded-full bg-white/10" />
        <h2 className="relative text-2xl font-extrabold tracking-tight sm:text-3xl">
          Go Solar Today — Save Money, Save Environment
        </h2>
        <p className="relative mx-auto mt-3 max-w-2xl text-sm text-white/90 sm:text-base">
          Book a free site survey this week and get your subsidy-adjusted quotation within 48 hours.
        </p>
        <div className="relative mt-8 flex flex-wrap justify-center gap-3">
          <TrackedLink event="quote_cta_click" eventParams={{ location: 'cta_banner' }} href="#contact" className="btn bg-navy text-white hover:bg-navy-700">
            Request a Quotation
          </TrackedLink>
          <TrackedLink event="whatsapp_click" eventParams={{ location: 'cta_banner' }} href={waLink()} target="_blank" rel="noopener" className="btn border-2 border-white text-white hover:bg-white hover:text-solar-600">
            Chat on WhatsApp
          </TrackedLink>
        </div>
      </div>
    </section>
  );
}
