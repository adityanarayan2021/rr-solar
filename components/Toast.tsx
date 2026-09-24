'use client';

import { useEffect } from 'react';

export type ToastMessage = { kind: 'ok' | 'err'; text: string } | null;

/**
 * Floating notification, fixed to the viewport rather than sitting in the page
 * flow — the admin tables are long, and an inline message near the top is
 * invisible when you're acting on a row far down the page.
 *
 * Errors stay until dismissed; successes clear themselves, since there is
 * nothing to act on.
 */
export default function Toast({
  message,
  onDismiss,
  autoHideMs = 5000,
}: {
  message: ToastMessage;
  onDismiss: () => void;
  autoHideMs?: number;
}) {
  useEffect(() => {
    if (!message || message.kind === 'err') return;
    const t = setTimeout(onDismiss, autoHideMs);
    return () => clearTimeout(t);
  }, [message, onDismiss, autoHideMs]);

  if (!message) return null;

  const ok = message.kind === 'ok';

  return (
    <div
      role="status"
      aria-live="polite"
      // Pinned just below the sticky admin header (z-40) so it is the first
      // thing in view no matter how far down the table you are.
      className="pointer-events-none fixed inset-x-0 top-20 z-[60] flex justify-center px-4"
    >
      <div
        className={`pointer-events-auto flex max-w-xl items-start gap-3 rounded-xl px-4 py-3 text-sm font-medium shadow-xl ring-1 ${
          ok ? 'bg-leaf text-white ring-leaf/40' : 'bg-white text-red-700 ring-red-200'
        }`}
        style={{ animation: 'toast-in .18s ease-out' }}
      >
        <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ${ok ? 'bg-white/25' : 'bg-red-100'}`}>
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            {ok ? <path d="m5 12.5 4.2 4.2L19 7" /> : <path d="M12 7.5v6M12 17h.01" />}
          </svg>
        </span>

        <span className="flex-1">{message.text}</span>

        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className={`shrink-0 rounded-full px-2 text-xs font-bold ${ok ? 'text-white/80 hover:text-white' : 'text-red-400 hover:text-red-700'}`}
        >
          ✕
        </button>
      </div>

      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
