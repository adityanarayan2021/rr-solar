'use client';

import { useEffect, useState } from 'react';
import Logo from './Logo';
import Icon from './Icon';
import { site, waLink } from '@/lib/site';
import { track } from '@/lib/analytics';

const nav = [
  { href: '#services', label: 'Services' },
  { href: '#why-us', label: 'Why Us' },
  { href: '#process', label: 'How It Works' },
  { href: '#segments', label: 'Who We Serve' },
  { href: '#projects', label: 'Our Work' },
  { href: '#faq', label: 'FAQs' },
  { href: '#contact', label: 'Contact' },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <div className="hidden bg-navy-900 py-2 text-xs text-white/80 md:block">
        <div className="container-x flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Icon name="pin" className="h-3.5 w-3.5 text-solar" />
            {site.address.street}, {site.address.city} - {site.address.postalCode}
          </span>
          <span className="flex items-center gap-5">
            <a href={`mailto:${site.email}`} className="flex items-center gap-2 hover:text-white">
              <Icon name="mail" className="h-3.5 w-3.5 text-solar" />
              {site.email}
            </a>
            <span className="flex items-center gap-2 font-semibold text-white">
              <Icon name="shield" className="h-3.5 w-3.5 text-leaf" />
              {site.certificationLabel}
            </span>
          </span>
        </div>
      </div>

      <header
        className={`sticky top-0 z-50 transition ${
          scrolled ? 'bg-white/95 shadow-md backdrop-blur' : 'bg-white'
        }`}
      >
        <div className="container-x flex h-20 items-center justify-between">
          <a href="#top" aria-label={site.name}>
            <Logo />
          </a>

          <nav className="hidden items-center gap-7 lg:flex">
            {nav.map((n) => (
              <a key={n.href} href={n.href} className="text-sm font-semibold text-navy/75 transition hover:text-solar">
                {n.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <a href={`tel:+91${site.phones[0]}`} onClick={() => track('call_click', { location: 'header' })} className="hidden items-center gap-2 text-sm font-bold text-navy sm:flex">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-solar/10 text-solar">
                <Icon name="phone" className="h-4 w-4" />
              </span>
              +91 {site.phones[0]}
            </a>
            <a href={waLink()} target="_blank" rel="noopener" onClick={() => track('whatsapp_click', { location: 'header' })} className="btn-solar hidden md:inline-flex">
              Get Free Quote
            </a>
            <button
              onClick={() => setOpen((v) => !v)}
              aria-label="Toggle menu"
              aria-expanded={open}
              className="grid h-10 w-10 place-items-center rounded-lg border border-navy/15 lg:hidden"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
          </div>
        </div>

        {open && (
          <div className="border-t border-navy/10 bg-white lg:hidden">
            <nav className="container-x flex flex-col py-3">
              {nav.map((n) => (
                <a
                  key={n.href}
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className="border-b border-navy/5 py-3 text-sm font-semibold text-navy/80"
                >
                  {n.label}
                </a>
              ))}
              <a href={waLink()} target="_blank" rel="noopener" onClick={() => track('whatsapp_click', { location: 'mobile_menu' })} className="btn-solar mt-4">
                Get Free Quote on WhatsApp
              </a>
            </nav>
          </div>
        )}
      </header>
    </>
  );
}
