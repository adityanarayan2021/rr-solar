'use client';

import { useState } from 'react';
import Logo from '@/components/Logo';

export default function LoginPage() {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const password = new FormData(e.currentTarget).get('password') as string;
    setBusy(true);
    setError('');
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) {
      const next = new URLSearchParams(window.location.search).get('next');
      window.location.href = next && next.startsWith('/admin') ? next : '/admin';
    } else {
      setError(json.error ?? 'Login failed.');
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-navy px-5">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl">
        <Logo />
        <h1 className="mt-8 text-xl font-extrabold text-navy">Admin login</h1>
        <p className="mt-1.5 text-sm text-navy/55">Enter the admin password to view website leads.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <input
            name="password"
            type="password"
            required
            autoFocus
            placeholder="Password"
            className="w-full rounded-xl border border-navy/15 px-4 py-3 text-sm outline-none focus:border-solar focus:ring-2 focus:ring-solar/25"
          />
          <button type="submit" disabled={busy} className="btn-solar w-full disabled:opacity-60">
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
          {error && <p className="rounded-lg bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600">{error}</p>}
        </form>

        <a href="/" className="mt-6 block text-center text-xs font-semibold text-navy/50 hover:text-solar">
          ← Back to website
        </a>
      </div>
    </main>
  );
}
