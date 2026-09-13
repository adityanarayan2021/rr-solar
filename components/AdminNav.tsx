'use client';

/**
 * Shared admin header. Every admin screen uses this, so navigation is identical
 * everywhere and there is no way to land on a page with no way back.
 */
const LINKS = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/visits', label: 'Site Visits' },
  { href: '/admin/projects', label: 'Projects' },
  { href: '/admin/reports', label: 'Reports' },
] as const;

export default function AdminNav({
  active,
  title,
  subtitle,
  children,
}: {
  active: '/admin' | '/admin/visits' | '/admin/projects' | '/admin/reports';
  title: string;
  subtitle?: React.ReactNode;
  /** Page-specific actions, rendered before the shared buttons. */
  children?: React.ReactNode;
}) {
  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    window.location.href = '/admin/login';
  }

  return (
    // Sticky: the reports page is long, and the nav must stay reachable.
    <header className="sticky top-0 z-40 border-b border-navy/10 bg-white/95 backdrop-blur">
      <div className="container-x flex min-h-16 flex-wrap items-center justify-between gap-3 py-3">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-lg font-extrabold leading-tight text-navy">{title}</h1>
            {subtitle && <p className="text-xs text-navy/50">{subtitle}</p>}
          </div>

          <nav className="flex gap-1">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                aria-current={active === l.href ? 'page' : undefined}
                className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                  active === l.href
                    ? 'bg-navy text-white'
                    : 'text-navy/60 hover:bg-navy-50 hover:text-navy'
                }`}
              >
                {l.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {children}
          <a
            href="/"
            target="_blank"
            rel="noopener"
            className="rounded-full border border-navy/15 px-4 py-2 text-xs font-bold text-navy hover:border-solar hover:text-solar"
          >
            View website ↗
          </a>
          <button
            onClick={logout}
            className="rounded-full border border-navy/15 px-4 py-2 text-xs font-bold text-navy/70 hover:border-red-300 hover:text-red-600"
          >
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
