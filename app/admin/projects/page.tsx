import { listProjects } from '@/lib/server/projects.service';
import { isDbConfigured } from '@/lib/server/db';
import { logger } from '@/lib/server/logger';
import DbError from '@/components/DbError';
import ProjectsManager from './ProjectsManager';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Projects', robots: { index: false, follow: false } };

export default async function ProjectsPage() {
  if (!isDbConfigured()) {
    return <DbError detail="MONGODB_URI is not set." />;
  }
  try {
    return <ProjectsManager initial={await listProjects()} />;
  } catch (err) {
    logger.error('admin.projects_page_failed', err);
    return <DbError detail={err instanceof Error ? err.message : String(err)} />;
  }
}
