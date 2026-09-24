import dns from 'node:dns';
import { MongoClient, type Db } from 'mongodb';
import { logger } from './logger';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB ?? 'rrsolar';

/**
 * MongoDB connection with an automatic workaround for blocked SRV DNS.
 *
 * `mongodb+srv://` requires a DNS SRV lookup over UDP port 53. Plenty of office
 * networks, ISPs and corporate resolvers refuse it, which surfaces as
 * `querySrv ECONNREFUSED` and takes the admin panel down.
 *
 * When that happens we resolve the same records over DNS-over-HTTPS instead.
 * DoH runs on port 443 — the same port every website uses — so it works
 * anywhere a browser does. We then build the plain `mongodb://` seed-list URI
 * that the driver would have built itself, and connect with that.
 *
 * Net effect: no manual connection-string surgery, and it behaves identically
 * on a blocked office network and on a cloud host.
 */

const DOH_ENDPOINTS = [
  (name: string, type: string) =>
    `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`,
  (name: string, type: string) =>
    `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`,
];

type DohAnswer = { name: string; type: number; data: string };

async function doh(name: string, type: 'SRV' | 'TXT'): Promise<DohAnswer[]> {
  let lastError: unknown;

  for (const build of DOH_ENDPOINTS) {
    try {
      const res = await fetch(build(name, type), {
        headers: { accept: 'application/dns-json' },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`DoH HTTP ${res.status}`);
      const json = (await res.json()) as { Answer?: DohAnswer[] };
      if (json.Answer?.length) return json.Answer;
      lastError = new Error(`No ${type} answer for ${name}`);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError ?? new Error(`DoH lookup failed for ${name}`);
}

/** mongodb+srv://user:pass@host/db?opts — split into parts we can rebuild. */
const SRV_URI = /^mongodb\+srv:\/\/(?:([^:@/]+)(?::([^@]*))?@)?([^/?]+)(?:\/([^?]*))?(?:\?(.*))?$/;

/**
 * Turns a `mongodb+srv://` URI into a `mongodb://` seed-list URI using DoH,
 * mirroring what the driver does internally with the system resolver.
 */
export async function srvToDirectUri(srvUri: string): Promise<string> {
  const m = SRV_URI.exec(srvUri);
  if (!m) throw new Error('MONGODB_URI is not a mongodb+srv:// string');

  const [, user, pass, host, database = '', query = ''] = m;

  // SRV records give the actual shard hostnames and ports.
  const srv = await doh(`_mongodb._tcp.${host}`, 'SRV');
  const seeds = srv
    .filter((a) => a.type === 33)
    .map((a) => {
      // "priority weight port target."
      const parts = a.data.trim().split(/\s+/);
      const port = parts[2];
      const target = parts[3].replace(/\.$/, '');
      return `${target}:${port}`;
    });

  if (seeds.length === 0) throw new Error('DoH returned no SRV targets');

  // Atlas publishes replicaSet and authSource in a TXT record on the same host.
  let txtParams = '';
  try {
    const txt = await doh(host, 'TXT');
    txtParams = txt
      .filter((a) => a.type === 16)
      .map((a) => a.data.replace(/^"|"$/g, '').replace(/""/g, ''))
      .join('&');
  } catch {
    // Not fatal: without it the driver discovers the topology from the seeds.
    logger.warn('db.doh_txt_missing', { host });
  }

  const params = new URLSearchParams(txtParams);
  for (const [k, v] of new URLSearchParams(query)) params.set(k, v);
  // mongodb+srv implies TLS; the plain scheme does not, so state it explicitly.
  params.set('tls', 'true');

  const credentials = user ? `${user}${pass ? `:${pass}` : ''}@` : '';
  return `mongodb://${credentials}${seeds.join(',')}/${database}?${params.toString()}`;
}

/** Errors that mean "the SRV lookup failed", as opposed to auth or timeouts. */
function isSrvFailure(err: unknown): boolean {
  const e = err as { syscall?: string; code?: string; message?: string };
  return (
    e?.syscall === 'querySrv' ||
    /querySrv|ESERVFAIL|ENOTFOUND|EAI_AGAIN|ECONNREFUSED/i.test(e?.message ?? '') === true
  );
}

/* ------------------------------------------------------------------ */

// Optional: point Node's resolver at public DNS. Tried before DoH because it
// is cheaper when it works.
const customDns = process.env.MONGODB_DNS_SERVERS;
if (customDns) {
  const servers = customDns.split(',').map((s) => s.trim()).filter(Boolean);
  try {
    dns.setServers(servers);
    logger.info('db.dns_override', { servers: servers.join(', ') });
  } catch (err) {
    logger.warn('db.dns_override_failed', { reason: String(err) });
  }
}

const globalForMongo = globalThis as unknown as {
  _mongoClientPromise?: Promise<MongoClient>;
  _mongoResolvedUri?: string;
};

export function isDbConfigured(): boolean {
  return Boolean(uri);
}

const CLIENT_OPTIONS = { maxPoolSize: 10, serverSelectionTimeoutMS: 10000 } as const;

async function connect(): Promise<MongoClient> {
  if (!uri) throw new Error('MONGODB_URI is not set');

  // A previously resolved seed-list URI skips the whole dance on reconnect.
  if (globalForMongo._mongoResolvedUri) {
    return new MongoClient(globalForMongo._mongoResolvedUri, CLIENT_OPTIONS).connect();
  }

  try {
    return await new MongoClient(uri, CLIENT_OPTIONS).connect();
  } catch (err) {
    if (!uri.startsWith('mongodb+srv://') || !isSrvFailure(err)) throw err;

    logger.warn('db.srv_blocked_falling_back_to_doh', {
      reason: err instanceof Error ? err.message : String(err),
    });

    const direct = await srvToDirectUri(uri);
    const client = await new MongoClient(direct, CLIENT_OPTIONS).connect();

    globalForMongo._mongoResolvedUri = direct;
    logger.info('db.connected_via_doh', { seeds: direct.split('@')[1]?.split('/')[0] });
    return client;
  }
}

export async function getDb(): Promise<Db> {
  if (!uri) throw new Error('MONGODB_URI is not set');

  if (!globalForMongo._mongoClientPromise) {
    // Cache the promise, not the resolved client, so concurrent requests share
    // one connection attempt. Clear it on failure, otherwise a single transient
    // error would be cached for the life of the process.
    globalForMongo._mongoClientPromise = connect().catch((err) => {
      globalForMongo._mongoClientPromise = undefined;
      globalForMongo._mongoResolvedUri = undefined;
      throw err;
    });
  }

  return (await globalForMongo._mongoClientPromise).db(dbName);
}
