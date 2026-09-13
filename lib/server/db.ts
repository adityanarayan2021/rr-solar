import dns from 'node:dns';
import { MongoClient, type Db } from 'mongodb';
import { logger } from './logger';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB ?? 'rrsolar';

/**
 * `mongodb+srv://` requires a DNS SRV lookup, which many corporate networks and
 * ISPs refuse (you see `querySrv ECONNREFUSED`). Node's MongoDB driver uses
 * Node's own resolver, so pointing that resolver at a public DNS server
 * sidesteps a broken or filtered local one.
 *
 * Set MONGODB_DNS_SERVERS="1.1.1.1,8.8.8.8" to enable. Harmless if unset.
 * If your network also blocks outbound port 53, use the non-SRV connection
 * string from Atlas instead — see SETUP.md.
 */
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

const globalForMongo = globalThis as unknown as { _mongoClientPromise?: Promise<MongoClient> };

export function isDbConfigured(): boolean {
  return Boolean(uri);
}

export async function getDb(): Promise<Db> {
  if (!uri) throw new Error('MONGODB_URI is not set');

  if (!globalForMongo._mongoClientPromise) {
    const client = new MongoClient(uri, { maxPoolSize: 10, serverSelectionTimeoutMS: 10000 });
    // Cache the promise, not the resolved client, so concurrent lambda
    // invocations share one connection attempt. Clear it on failure, otherwise a
    // single transient error would be cached for the life of the process.
    globalForMongo._mongoClientPromise = client.connect().catch((err) => {
      globalForMongo._mongoClientPromise = undefined;
      throw err;
    });
  }

  return (await globalForMongo._mongoClientPromise).db(dbName);
}
