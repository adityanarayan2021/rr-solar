'use client';

import { CLIENT_JPEG_QUALITY, CLIENT_MAX_DIMENSION } from './project-types';

/**
 * Downscales a photo in the browser before upload.
 *
 * Two reasons this matters: Vercel rejects request bodies over ~4.5 MB, and a
 * 12 MB phone photo over an Indian mobile connection is a slow, failure-prone
 * upload. A 1600px JPEG is indistinguishable on a website and typically lands
 * under 500 KB.
 *
 * The server still re-encodes with sharp — this is a convenience, not the
 * security boundary.
 */
export async function downscaleImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file;

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file; // let the server reject it

  const { width, height } = bitmap;
  const scale = Math.min(1, CLIENT_MAX_DIMENSION / Math.max(width, height));

  // Small and already light? Leave it alone.
  if (scale === 1 && file.size < 1_000_000) {
    bitmap.close();
    return file;
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', CLIENT_JPEG_QUALITY),
  );
  if (!blob || blob.size >= file.size) return file; // no gain, keep the original

  return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', {
    type: 'image/jpeg',
    lastModified: Date.now(),
  });
}

export const kb = (bytes: number) =>
  bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
