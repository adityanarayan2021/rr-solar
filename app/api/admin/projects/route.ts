import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createProject, listProjects, storeImage } from '@/lib/server/projects.service';
import { requestLogger } from '@/lib/server/logger';
import { ACCEPTED_TYPES, MAX_UPLOAD_BYTES } from '@/lib/project-types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: Request) {
  const log = requestLogger(req, 'admin.projects.list');
  try {
    return NextResponse.json({ projects: await listProjects() });
  } catch (err) {
    log.error('projects.list_failed', err);
    return NextResponse.json({ error: 'Could not load projects.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const log = requestLogger(req, 'admin.projects.create');
  const done = log.timer('project.created');

  // Check the declared size first: req.formData() throws an opaque error when the
  // body exceeds the platform limit, which would surface as a confusing message.
  const declared = Number(req.headers.get('content-length') ?? 0);
  if (declared > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      {
        error: `That photo is ${(declared / 1048576).toFixed(1)} MB after compression, over the ${(
          MAX_UPLOAD_BYTES / 1048576
        ).toFixed(0)} MB limit. Try a smaller photo.`,
      },
      { status: 413 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch (err) {
    log.warn('project.upload_body_rejected', { declaredBytes: declared });
    return NextResponse.json(
      { error: 'The upload was too large or malformed. Try a smaller photo.' },
      { status: 413 },
    );
  }

  const file = form.get('image');
  const title = String(form.get('title') ?? '').trim();
  const location = String(form.get('location') ?? '').trim();

  if (!(file instanceof File)) return NextResponse.json({ error: 'Please choose a photo.' }, { status: 400 });
  if (!title) return NextResponse.json({ error: 'Please enter a project title.' }, { status: 400 });
  if (!location) return NextResponse.json({ error: 'Please enter the location.' }, { status: 400 });

  if (!ACCEPTED_TYPES.includes(file.type as (typeof ACCEPTED_TYPES)[number])) {
    return NextResponse.json({ error: 'Only JPG, PNG and WebP images are supported.' }, { status: 415 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `That photo is ${(file.size / 1048576).toFixed(1)} MB. Maximum is 10 MB.` },
      { status: 413 },
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    // sharp throws on anything that isn't really an image, so a renamed .exe
    // never reaches the database.
    const image = await storeImage(buffer);

    const capacityRaw = form.get('capacityKw');
    const capacityKw = capacityRaw ? Number(capacityRaw) : undefined;

    const project = await createProject(
      {
        title,
        location,
        capacityKw: Number.isFinite(capacityKw) && capacityKw! > 0 ? capacityKw : undefined,
        serviceType: String(form.get('serviceType') ?? '').trim() || undefined,
        completedOn: String(form.get('completedOn') ?? '').trim() || undefined,
        alt: String(form.get('alt') ?? '').trim() || undefined,
      },
      image,
    );

    revalidatePath('/'); // push the new photo to the live homepage immediately
    done({ projectId: project.id, outputBytes: image.bytes });
    return NextResponse.json({ project });
  } catch (err) {
    log.error('project.create_failed', err);
    const msg = err instanceof Error && /unsupported image|Input buffer/i.test(err.message)
      ? 'That file could not be read as an image.'
      : 'Could not save the project.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
