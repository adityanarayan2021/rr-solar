import { process } from '@/lib/site';

export default function Process() {
  return (
    <section id="process" className="py-20 sm:py-24">
      <div className="container-x">
        <div className="max-w-2xl">
          <span className="eyebrow">How It Works</span>
          <h2 className="h2 mt-4 text-navy">From first call to first unit exported</h2>
        </div>

        <ol className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {process.map((p, i) => (
            <li key={p.step} className="relative">
              <div className="flex items-center gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-navy text-sm font-extrabold text-solar">
                  {p.step}
                </span>
                {i < process.length - 1 && (
                  <span className="hidden h-px flex-1 bg-gradient-to-r from-solar/60 to-transparent lg:block" />
                )}
              </div>
              <h3 className="mt-5 text-base font-bold text-navy">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-navy/60">{p.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
