import { readImage } from '@/lib/server/projects.service';

export const runtime = 'nodejs';

/**
 * Public image endpoint. Content is immutable — a new upload gets a new id —
 * so it can be cached hard by the browser and the Vercel edge.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const img = await readImage(id);
    if (!img) return new Response('Not found', { status: 404 });

    return new Response(img.data as unknown as ArrayBuffer, {
      headers: {
        'Content-Type': img.contentType,
        'Content-Length': String(img.data.length),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
