import { ObjectId, type Collection } from 'mongodb';
import { getDb, isDbConfigured } from './db';
import {
  LEAD_STATUSES,
  type Attribution,
  type Lead,
  type LeadInput,
  type LeadOps,
  type LeadStatus,
} from '../lead-types';

/**
 * The ONLY module that touches the leads collection. Every read and write in the
 * app goes through these functions.
 *
 * NestJS port: paste this file's body into a @Injectable() LeadsService, swap the
 * getDb() call for an injected collection, and the API routes become controllers.
 * Nothing in the UI needs to change.
 */

export type LeadDoc = LeadInput &
  LeadOps &
  Attribution & {
    _id: ObjectId;
    userAgent?: string;
    createdAt: Date;
    updatedAt: Date;
  };

export function serialise(doc: LeadDoc): Lead {
  const { _id, createdAt, updatedAt, userAgent: _ua, ...rest } = doc;
  return { ...rest, id: _id.toHexString(), createdAt: createdAt.toISOString(), updatedAt: updatedAt.toISOString() };
}

export async function collection(): Promise<Collection<LeadDoc>> {
  const db = await getDb();
  const col = db.collection<LeadDoc>('leads');
  // Idempotent — Mongo no-ops when the index already exists.
  await Promise.all([
    col.createIndex({ createdAt: -1 }).catch(() => {}),
    col.createIndex({ status: 1, createdAt: -1 }).catch(() => {}),
    col.createIndex({ source: 1 }).catch(() => {}),
  ]);
  return col;
}

export async function createLead(
  input: LeadInput & Partial<Attribution> & { userAgent?: string },
): Promise<string | null> {
  if (!isDbConfigured()) return null;
  const now = new Date();
  const col = await collection();
  const res = await col.insertOne({
    ...input,
    source: input.source ?? 'Direct',
    status: 'New',
    notes: '',
    createdAt: now,
    updatedAt: now,
  } as LeadDoc);
  return res.insertedId.toHexString();
}

export async function listLeads(opts: { status?: string; q?: string; limit?: number } = {}): Promise<Lead[]> {
  if (!isDbConfigured()) return [];
  const filter: Record<string, unknown> = {};
  if (opts.status && opts.status !== 'All') filter.status = opts.status;
  if (opts.q) {
    const rx = new RegExp(opts.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: rx }, { phone: rx }, { email: rx }, { city: rx }, { service: rx }];
  }
  const col = await collection();
  const docs = await col.find(filter).sort({ createdAt: -1 }).limit(opts.limit ?? 500).toArray();
  return docs.map(serialise);
}

export async function listLeadsBetween(from: Date, to: Date): Promise<Lead[]> {
  if (!isDbConfigured()) return [];
  const col = await collection();
  const docs = await col.find({ createdAt: { $gte: from, $lt: to } }).sort({ createdAt: -1 }).toArray();
  return docs.map(serialise);
}

const NUMERIC_FIELDS = ['systemKw', 'quoteAmount'] as const;

export async function updateLead(id: string, patch: Partial<LeadOps>): Promise<boolean> {
  if (!isDbConfigured() || !ObjectId.isValid(id)) return false;

  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.status && LEAD_STATUSES.includes(patch.status)) set.status = patch.status;
  if (typeof patch.notes === 'string') set.notes = patch.notes.slice(0, 4000);
  if (typeof patch.assignedTo === 'string') set.assignedTo = patch.assignedTo.slice(0, 120);
  if (typeof patch.elecLoad === 'string') set.elecLoad = patch.elecLoad.slice(0, 40);
  if (typeof patch.visitDate === 'string') set.visitDate = patch.visitDate.slice(0, 40);

  for (const f of NUMERIC_FIELDS) {
    const v = patch[f];
    if (v === null || v === undefined) continue;
    const n = Number(v);
    if (Number.isFinite(n) && n >= 0) set[f] = n;
  }

  const col = await collection();
  const res = await col.updateOne({ _id: new ObjectId(id) }, { $set: set });
  return res.matchedCount > 0;
}

export async function getLead(id: string): Promise<Lead | null> {
  if (!isDbConfigured() || !ObjectId.isValid(id)) return null;
  const col = await collection();
  const doc = await col.findOne({ _id: new ObjectId(id) });
  return doc ? serialise(doc) : null;
}

/** Site visits in a date window, for the schedule view. visitDate is stored as
 *  'YYYY-MM-DD', so a lexicographic range query is correct here. */
export async function listVisits(fromISO: string, toISO: string): Promise<Lead[]> {
  if (!isDbConfigured()) return [];
  const col = await collection();
  const docs = await col
    .find({ visitDate: { $gte: fromISO, $lte: toISO, $ne: '' }, status: { $nin: ['Lost'] } })
    .sort({ visitDate: 1 })
    .toArray();
  return docs.map(serialise);
}

export async function statusCounts(): Promise<Record<string, number>> {
  if (!isDbConfigured()) return {};
  const col = await collection();
  const rows = await col.aggregate<{ _id: LeadStatus; n: number }>([
    { $group: { _id: '$status', n: { $sum: 1 } } },
  ]).toArray();
  return Object.fromEntries(rows.map((r) => [r._id, r.n]));
}
