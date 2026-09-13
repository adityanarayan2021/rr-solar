import { ObjectId, type Collection } from 'mongodb';
import sharp from 'sharp';
import { getDb, isDbConfigured } from './db';
import { logger } from './logger';
import type { Project } from '../project-types';

/**
 * Projects gallery.
 *
 * Images are stored in MongoDB rather than an external blob service: it needs no
 * extra signup, behaves identically locally and in production, and a gallery of
 * a few dozen compressed photos is comfortably inside the free tier. Every
 * upload is re-encoded to WebP at max 1600px, which typically lands under 200 KB.
 *
 * If the gallery ever grows into hundreds of images, move `media` to S3/Vercel
 * Blob and keep this interface — only storeImage/readImage change.
 */

const MAX_DIMENSION = 1600;
const WEBP_QUALITY = 80;

type ProjectDoc = Omit<Project, 'id' | 'createdAt'> & { _id: ObjectId; createdAt: Date };
type MediaDoc = { _id: ObjectId; data: Buffer; contentType: string; bytes: number; createdAt: Date };

function serialise(d: ProjectDoc): Project {
  const { _id, createdAt, ...rest } = d;
  return { ...rest, id: _id.toHexString(), createdAt: createdAt.toISOString() };
}

async function projects(): Promise<Collection<ProjectDoc>> {
  const db = await getDb();
  const col = db.collection<ProjectDoc>('projects');
  await Promise.all([
    col.createIndex({ order: 1, createdAt: -1 }).catch(() => {}),
    col.createIndex({ published: 1 }).catch(() => {}),
  ]);
  return col;
}

async function media(): Promise<Collection<MediaDoc>> {
  return (await getDb()).collection<MediaDoc>('media');
}

/* ------------------------------------------------------------------ */
/* Images                                                              */
/* ------------------------------------------------------------------ */

export type StoredImage = { imageId: string; width: number; height: number; bytes: number };

/** Re-encodes to WebP and stores it. Also strips EXIF, which can carry GPS data. */
export async function storeImage(input: Buffer): Promise<StoredImage> {
  const pipeline = sharp(input, { failOn: 'error' })
    .rotate() // honour EXIF orientation before the metadata is dropped
    .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY });

  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });

  const col = await media();
  const res = await col.insertOne({
    data: Buffer.from(data),
    contentType: 'image/webp',
    bytes: data.length,
    createdAt: new Date(),
  } as MediaDoc);

  logger.info('media.stored', {
    imageId: res.insertedId.toHexString(),
    inputBytes: input.length,
    outputBytes: data.length,
    width: info.width,
    height: info.height,
  });

  return { imageId: res.insertedId.toHexString(), width: info.width, height: info.height, bytes: data.length };
}

export async function readImage(id: string): Promise<{ data: Buffer; contentType: string } | null> {
  if (!isDbConfigured() || !ObjectId.isValid(id)) return null;
  const col = await media();
  const doc = await col.findOne({ _id: new ObjectId(id) });
  return doc ? { data: doc.data, contentType: doc.contentType } : null;
}

async function deleteImage(id: string): Promise<void> {
  if (!ObjectId.isValid(id)) return;
  const col = await media();
  await col.deleteOne({ _id: new ObjectId(id) });
}

/* ------------------------------------------------------------------ */
/* Projects                                                            */
/* ------------------------------------------------------------------ */

export type NewProject = {
  title: string;
  location: string;
  capacityKw?: number;
  serviceType?: string;
  completedOn?: string;
  alt?: string;
};

export async function listProjects(opts: { publishedOnly?: boolean } = {}): Promise<Project[]> {
  if (!isDbConfigured()) return [];
  const col = await projects();
  const filter = opts.publishedOnly ? { published: true } : {};
  const docs = await col.find(filter).sort({ order: 1, createdAt: -1 }).limit(200).toArray();
  return docs.map(serialise);
}

export async function createProject(meta: NewProject, image: StoredImage): Promise<Project> {
  const col = await projects();
  const last = await col.find({}).sort({ order: -1 }).limit(1).toArray();
  const doc = {
    title: meta.title,
    location: meta.location,
    capacityKw: meta.capacityKw,
    serviceType: meta.serviceType,
    completedOn: meta.completedOn,
    imageId: image.imageId,
    width: image.width,
    height: image.height,
    alt: meta.alt?.trim() || `${meta.title} — solar installation in ${meta.location}`,
    order: (last[0]?.order ?? 0) + 1,
    published: true,
    createdAt: new Date(),
  } as Omit<ProjectDoc, '_id'>;

  const res = await col.insertOne(doc as ProjectDoc);
  return serialise({ ...(doc as ProjectDoc), _id: res.insertedId });
}

export async function updateProject(
  id: string,
  patch: Partial<Pick<Project, 'title' | 'location' | 'capacityKw' | 'serviceType' | 'completedOn' | 'alt' | 'published' | 'order'>>,
): Promise<boolean> {
  if (!isDbConfigured() || !ObjectId.isValid(id)) return false;
  const set: Record<string, unknown> = {};
  if (typeof patch.title === 'string') set.title = patch.title.slice(0, 160);
  if (typeof patch.location === 'string') set.location = patch.location.slice(0, 160);
  if (typeof patch.serviceType === 'string') set.serviceType = patch.serviceType.slice(0, 160);
  if (typeof patch.completedOn === 'string') set.completedOn = patch.completedOn.slice(0, 10);
  if (typeof patch.alt === 'string') set.alt = patch.alt.slice(0, 300);
  if (typeof patch.published === 'boolean') set.published = patch.published;
  if (Number.isFinite(patch.capacityKw)) set.capacityKw = Number(patch.capacityKw);
  if (Number.isFinite(patch.order)) set.order = Number(patch.order);
  if (Object.keys(set).length === 0) return false;

  const col = await projects();
  const res = await col.updateOne({ _id: new ObjectId(id) }, { $set: set });
  return res.matchedCount > 0;
}

/** Deletes the project and its image together, so no orphaned binaries build up. */
export async function deleteProject(id: string): Promise<boolean> {
  if (!isDbConfigured() || !ObjectId.isValid(id)) return false;
  const col = await projects();
  const doc = await col.findOne({ _id: new ObjectId(id) });
  if (!doc) return false;
  await col.deleteOne({ _id: new ObjectId(id) });
  await deleteImage(doc.imageId);
  logger.info('project.deleted', { projectId: id, imageId: doc.imageId });
  return true;
}
