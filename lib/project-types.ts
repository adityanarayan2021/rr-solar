/** Client-safe types for the projects gallery. No server imports here. */

export type Project = {
  id: string;
  title: string;
  location: string;          // e.g. "Gomti Nagar, Lucknow"
  capacityKw?: number;
  serviceType?: string;      // e.g. "Rooftop Solar Installation"
  completedOn?: string;      // 'YYYY-MM'
  imageId: string;           // -> /api/media/<imageId>
  width: number;
  height: number;
  alt: string;
  order: number;
  published: boolean;
  createdAt: string;
};

/**
 * Vercel's serverless functions reject request bodies over ~4.5 MB, so this is a
 * platform limit, not a preference. The admin UI downscales every photo in the
 * browser before uploading, which keeps typical uploads under 1 MB — this cap is
 * only a backstop.
 */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // 4 MB
export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

/** Browser-side downscale target before upload. */
export const CLIENT_MAX_DIMENSION = 1600;
export const CLIENT_JPEG_QUALITY = 0.85;

export const mediaUrl = (imageId: string) => `/api/media/${imageId}`;
