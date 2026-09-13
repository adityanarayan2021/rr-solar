'use client';

import { useRef, useState } from 'react';
import AdminNav from '@/components/AdminNav';
import { mediaUrl, type Project } from '@/lib/project-types';
import { downscaleImage, kb } from '@/lib/image-resize';
import { services } from '@/lib/site';

export default function ProjectsManager({ initial }: { initial: Project[] }) {
  const [projects, setProjects] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [sizeNote, setSizeNote] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function upload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setToast(null);
    try {
      // Shrink before sending: Vercel rejects bodies over ~4.5 MB, and phone
      // photos are routinely 8-12 MB.
      const picked = form.get('image');
      if (picked instanceof File && picked.size > 0) {
        form.set('image', await downscaleImage(picked));
      }
      const res = await fetch('/api/admin/projects', { method: 'POST', body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Upload failed.');
      setProjects((p) => [...p, json.project]);
      formRef.current?.reset();
      setPreview(null);
      setSizeNote(null);
      setToast({ kind: 'ok', text: 'Photo added and published to the website.' });
    } catch (err) {
      setToast({ kind: 'err', text: err instanceof Error ? err.message : 'Upload failed.' });
    } finally {
      setBusy(false);
    }
  }

  async function togglePublished(p: Project) {
    const published = !p.published;
    setProjects((list) => list.map((x) => (x.id === p.id ? { ...x, published } : x)));
    await fetch(`/api/admin/projects/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ published }),
    }).catch(() => {});
  }

  async function remove(p: Project) {
    if (!confirm(`Delete "${p.title}"? The photo is removed permanently.`)) return;
    setProjects((list) => list.filter((x) => x.id !== p.id));
    const res = await fetch(`/api/admin/projects/${p.id}`, { method: 'DELETE' });
    setToast(
      res.ok
        ? { kind: 'ok', text: 'Project deleted.' }
        : { kind: 'err', text: 'Could not delete — refresh and try again.' },
    );
  }

  const field =
    'w-full rounded-xl border border-navy/15 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-solar focus:ring-2 focus:ring-solar/20';
  const label = 'block text-[11px] font-bold uppercase tracking-wider text-navy/50 mb-1.5';

  return (
    <main className="min-h-screen bg-navy-50/60">
      <AdminNav
        active="/admin/projects"
        title="Project Photos"
        subtitle={`${projects.length} project${projects.length === 1 ? '' : 's'} · ${projects.filter((p) => p.published).length} live on the website`}
      />

      {toast && (
        <div className="container-x pt-4">
          <div
            role="status"
            className={`flex items-center justify-between gap-4 rounded-xl px-4 py-3 text-sm font-medium ${
              toast.kind === 'ok' ? 'bg-leaf/10 text-leaf' : 'bg-red-50 text-red-600'
            }`}
          >
            {toast.text}
            <button onClick={() => setToast(null)} className="text-xs font-bold opacity-60 hover:opacity-100">
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="container-x grid gap-6 py-7 lg:grid-cols-[380px_1fr] lg:items-start">
        {/* ---------- Upload ---------- */}
        <form
          ref={formRef}
          onSubmit={upload}
          className="rounded-2xl border border-navy/10 bg-white p-6 lg:sticky lg:top-24"
        >
          <h2 className="text-sm font-bold uppercase tracking-wider text-navy">Add a project</h2>
          <p className="mt-1.5 text-xs text-navy/50">
            Photos are resized in your browser before uploading, so large phone photos are fine. JPG, PNG or WebP.
          </p>

          <div className="mt-5 space-y-4">
            <div>
              <label className={label} htmlFor="image">Photo *</label>
              <input
                id="image"
                name="image"
                type="file"
                required
                accept="image/jpeg,image/png,image/webp"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  setPreview(f ? URL.createObjectURL(f) : null);
                  if (!f) return setSizeNote(null);
                  const shrunk = await downscaleImage(f);
                  setSizeNote(
                    shrunk.size < f.size
                      ? `${kb(f.size)} → ${kb(shrunk.size)} after resizing`
                      : kb(f.size),
                  );
                }}
                className="w-full text-xs file:mr-3 file:rounded-full file:border-0 file:bg-navy file:px-4 file:py-2 file:text-xs file:font-bold file:text-white hover:file:bg-navy-700"
              />
              {preview && (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt="Selected photo preview" className="mt-3 h-40 w-full rounded-xl object-cover" />
                  {sizeNote && <p className="mt-2 text-[11px] font-semibold text-leaf">{sizeNote}</p>}
                </>
              )}
            </div>

            <div>
              <label className={label} htmlFor="title">Title *</label>
              <input id="title" name="title" required placeholder="3 kW rooftop for Mr. Verma" className={field} />
            </div>

            <div>
              <label className={label} htmlFor="location">Location *</label>
              <input id="location" name="location" required placeholder="Gomti Nagar, Lucknow" className={field} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label} htmlFor="capacityKw">Capacity (kW)</label>
                <input id="capacityKw" name="capacityKw" type="number" min="0" step="0.5" placeholder="3" className={field} />
              </div>
              <div>
                <label className={label} htmlFor="completedOn">Completed</label>
                <input id="completedOn" name="completedOn" type="month" className={field} />
              </div>
            </div>

            <div>
              <label className={label} htmlFor="serviceType">Service</label>
              <select id="serviceType" name="serviceType" defaultValue="" className={field}>
                <option value="">Not specified</option>
                {services.map((s) => (
                  <option key={s.slug} value={s.title}>{s.title}</option>
                ))}
              </select>
            </div>

            <button type="submit" disabled={busy} className="btn-solar w-full disabled:opacity-60">
              {busy ? 'Uploading…' : 'Upload photo'}
            </button>
          </div>
        </form>

        {/* ---------- Grid ---------- */}
        <section>
          {projects.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-navy/20 bg-white p-14 text-center">
              <p className="text-sm font-semibold text-navy">No project photos yet</p>
              <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-navy/50">
                Photos of your real installations convert far better than stock imagery. Add a few and they appear on
                the website immediately.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {projects.map((p) => (
                <article key={p.id} className="overflow-hidden rounded-2xl border border-navy/10 bg-white">
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={mediaUrl(p.imageId)} alt={p.alt} className="h-44 w-full object-cover" loading="lazy" />
                    {!p.published && (
                      <span className="absolute left-3 top-3 rounded-full bg-navy/80 px-2.5 py-1 text-[10px] font-bold text-white">
                        HIDDEN
                      </span>
                    )}
                  </div>

                  <div className="p-4">
                    <h3 className="truncate text-sm font-bold text-navy">{p.title}</h3>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-navy/55">
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 text-solar" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z" />
                        <circle cx="12" cy="10" r="2.6" />
                      </svg>
                      <span className="truncate">{p.location}</span>
                    </p>
                    <p className="mt-1 text-xs text-navy/40">
                      {[p.capacityKw ? `${p.capacityKw} kW` : null, p.serviceType, p.completedOn]
                        .filter(Boolean)
                        .join(' · ') || '—'}
                    </p>

                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => togglePublished(p)}
                        className="flex-1 rounded-full border border-navy/15 px-3 py-1.5 text-xs font-bold text-navy hover:border-solar hover:text-solar"
                      >
                        {p.published ? 'Hide' : 'Show'}
                      </button>
                      <button
                        onClick={() => remove(p)}
                        className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
