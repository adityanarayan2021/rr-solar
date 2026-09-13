'use client';

import { useEffect, useState } from 'react';
import Icon from './Icon';
import { services, site, waLink } from '@/lib/site';
import { track } from '@/lib/analytics';
import { captureAttribution, getAttribution } from '@/lib/attribution';

type Status = 'idle' | 'sending' | 'sent' | 'error';

export default function Contact() {
  const [status, setStatus] = useState<Status>('idle');
  // Record where this visitor came from as soon as the form mounts.
  useEffect(() => captureAttribution(), []);
  const [message, setMessage] = useState('');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    setStatus('sending');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, ...getAttribution() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Something went wrong');
      setStatus('sent');
      track('lead_submit', { service: String(data.service ?? 'unknown') });
      setMessage(json.message ?? 'Thank you! Our team will call you shortly.');
      form.reset();
    } catch (err) {
      setStatus('error');
      track('lead_submit_failed');
      setMessage(err instanceof Error ? err.message : 'Could not send. Please call us instead.');
    }
  }

  const field =
    'w-full rounded-xl border border-navy/15 bg-white px-4 py-3 text-sm text-navy outline-none transition placeholder:text-navy/35 focus:border-solar focus:ring-2 focus:ring-solar/25';

  return (
    <section id="contact" className="bg-navy-50/60 py-20 sm:py-24">
      <div className="container-x grid gap-10 lg:grid-cols-[1fr_.85fr]">
        <div className="rounded-3xl border border-navy/10 bg-white p-7 shadow-sm sm:p-9">
          <span className="eyebrow">Contact Us</span>
          <h2 className="h2 mt-4 text-navy">Request your free quotation</h2>
          <p className="mt-3 text-sm text-navy/60">
            Fill this in and we&apos;ll call back the same working day. Fields marked * are required.
          </p>

          <form onSubmit={onSubmit} className="mt-8 grid gap-4 sm:grid-cols-2">
            {/* Honeypot: hidden from humans, bots fill it and get silently dropped. */}
            <input name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
            <input name="name" required placeholder="Full name *" className={field} />
            <input name="phone" required inputMode="tel" pattern="[0-9+ -]{10,15}" placeholder="Mobile number *" className={field} />
            <input name="email" type="email" placeholder="Email address" className={field} />
            <input name="city" placeholder="City / locality" className={field} />
            <select name="service" defaultValue="" className={`${field} sm:col-span-1`} required>
              <option value="" disabled>
                Service required *
              </option>
              {services.map((s) => (
                <option key={s.slug} value={s.title}>
                  {s.title}
                </option>
              ))}
            </select>
            <select name="bill" defaultValue="" className={field}>
              <option value="">Monthly electricity bill</option>
              <option>Under ₹2,000</option>
              <option>₹2,000 – ₹5,000</option>
              <option>₹5,000 – ₹15,000</option>
              <option>₹15,000 – ₹50,000</option>
              <option>Above ₹50,000</option>
            </select>
            <textarea
              name="message"
              rows={4}
              placeholder="Tell us about your roof area, load or project"
              className={`${field} sm:col-span-2`}
            />

            <div className="sm:col-span-2 flex flex-wrap items-center gap-4">
              <button type="submit" disabled={status === 'sending'} className="btn-solar disabled:opacity-60">
                {status === 'sending' ? 'Sending…' : 'Get Free Quote'}
              </button>
              <a href={waLink()} target="_blank" rel="noopener" onClick={() => track('whatsapp_click', { location: 'contact_form' })} className="text-sm font-bold text-leaf hover:underline">
                or message us on WhatsApp →
              </a>
            </div>

            {status !== 'idle' && status !== 'sending' && (
              <p
                role="status"
                className={`sm:col-span-2 rounded-xl px-4 py-3 text-sm font-medium ${
                  status === 'sent' ? 'bg-leaf/10 text-leaf' : 'bg-red-50 text-red-600'
                }`}
              >
                {message}
              </p>
            )}
          </form>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl bg-navy p-8 text-white">
            <h3 className="text-lg font-bold">Reach us directly</h3>
            <ul className="mt-6 space-y-5 text-sm">
              {site.phones.map((p) => (
                <li key={p}>
                  <a href={`tel:+91${p}`} className="flex items-center gap-3.5 font-semibold hover:text-solar">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 text-solar">
                      <Icon name="phone" className="h-4.5 w-4.5" />
                    </span>
                    +91 {p}
                  </a>
                </li>
              ))}
              <li>
                <a href={`mailto:${site.email}`} className="flex items-center gap-3.5 break-all hover:text-solar">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 text-solar">
                    <Icon name="mail" className="h-4.5 w-4.5" />
                  </span>
                  {site.email}
                </a>
              </li>
              <li>
                <a href={site.url} className="flex items-center gap-3.5 hover:text-solar">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 text-solar">
                    <Icon name="globe" className="h-4.5 w-4.5" />
                  </span>
                  www.rrsolarsolutions.in
                </a>
              </li>
              <li className="flex items-start gap-3.5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 text-solar">
                  <Icon name="pin" className="h-4.5 w-4.5" />
                </span>
                <span className="leading-relaxed text-white/80">
                  {site.address.street},<br />
                  {site.address.city} – {site.address.postalCode}, {site.address.region}, India
                </span>
              </li>
            </ul>
          </div>

          <div className="overflow-hidden rounded-3xl border border-navy/10">
            <iframe
              title="RR Solar Solutions location"
              src="https://www.google.com/maps?q=Atrauli%20Kursi%20Road%20Lucknow%20226022&output=embed"
              className="h-64 w-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
