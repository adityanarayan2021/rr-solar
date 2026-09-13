export default function DbError({ detail }: { detail?: string }) {
  const dns = detail?.includes('querySrv') || detail?.includes('ENOTFOUND');
  const auth = detail?.includes('Authentication failed') || detail?.includes('bad auth');
  const timeout = detail?.includes('Server selection timed out') || detail?.includes('ETIMEDOUT');

  return (
    <main className="grid min-h-screen place-items-center bg-navy-50 px-6">
      <div className="max-w-lg rounded-2xl bg-white p-8 shadow">
        <h1 className="text-lg font-bold text-navy">Can&apos;t reach the database</h1>
        <p className="mt-3 text-sm text-navy/60">
          The site is running, but it couldn&apos;t connect to MongoDB. Leads submitted right now are logged to the
          server console and not stored.
        </p>

        <ul className="mt-5 space-y-2.5 text-sm text-navy/70">
          {auth && (
            <li className="rounded-lg bg-red-50 p-3 font-semibold text-red-700">
              Authentication failed — the username or password in MONGODB_URI is wrong. If the password contains
              @ : / ? # [ ] or %, it must be URL-encoded.
            </li>
          )}
          {timeout && (
            <li className="rounded-lg bg-amber-50 p-3 font-semibold text-amber-800">
              Connection timed out — most often Atlas Network Access. Add 0.0.0.0/0 under Network Access.
            </li>
          )}
          {dns && (
            <li className="rounded-lg bg-amber-50 p-3 text-amber-900">
              <p className="font-semibold">Your network is blocking MongoDB SRV DNS records.</p>
              <p className="mt-1.5 font-normal">
                This is common on office and ISP networks. Nothing is wrong with your password or the cluster. Two ways
                round it:
              </p>
              <p className="mt-2 font-normal">
                <strong>A.</strong> Add{' '}
                <code className="rounded bg-white/60 px-1">MONGODB_DNS_SERVERS=&quot;1.1.1.1,8.8.8.8&quot;</code> to
                .env.local and restart.
              </p>
              <p className="mt-1.5 font-normal">
                <strong>B.</strong> In Atlas use the non-SRV string: Connect → Drivers → set Driver version to
                &quot;Node.js 2.2.12 or later&quot;. It starts <code className="rounded bg-white/60 px-1">mongodb://</code>{' '}
                and needs no SRV lookup. This one survives office network policy.
              </p>
            </li>
          )}
          <li>1. Atlas → <strong>Network Access</strong> → allow <code className="rounded bg-navy-50 px-1">0.0.0.0/0</code></li>
          <li>2. Atlas → <strong>Database Access</strong> → confirm the user and password</li>
          <li>3. Restart the dev server after editing <code className="rounded bg-navy-50 px-1">.env.local</code></li>
        </ul>

        {detail && (
          <details className="mt-5">
            <summary className="cursor-pointer text-xs font-bold text-navy/50">Technical detail</summary>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-navy-50 p-3 text-[11px] text-navy/70">{detail}</pre>
          </details>
        )}
      </div>
    </main>
  );
}
