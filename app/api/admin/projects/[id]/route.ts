import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { deleteProject, updateProject } from '@/lib/server/projects.service';
import { requestLogger } from '@/lib/server/logger';

export const runtime = 'nodejs';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const log = requestLogger(req, 'admin.projects.update');
  const body = await req.json().catch(() => ({}));

  try {
    const ok = await updateProject(id, body);
    if (!ok) return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
    revalidatePath('/');
    log.info('project.updated', { projectId: id, fields: Object.keys(body).join(',') });
    return NextResponse.json({ ok: true });
  } catch (err) {
    log.error('project.update_failed', err, { projectId: id });
    return NextResponse.json({ error: 'Could not update the project.' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const log = requestLogger(req, 'admin.projects.delete');

  try {
    const ok = await deleteProject(id);
    if (!ok) return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
    revalidatePath('/');
    return NextResponse.json({ ok: true });
  } catch (err) {
    log.error('project.delete_failed', err, { projectId: id });
    return NextResponse.json({ error: 'Could not delete the project.' }, { status: 500 });
  }
}
