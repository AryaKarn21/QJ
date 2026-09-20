// Centralized media and resume URL resolution utilities.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://qj.onrender.com';
const MEDIA_URL = import.meta.env.VITE_MEDIA_URL || API_BASE_URL;

const isProduction =
  import.meta.env.PROD ||
  !MEDIA_URL.includes('localhost') && !MEDIA_URL.includes('127.0.0.1');

/**
 * Resolves any media path into a valid fetchable URL.
 * - Leaves absolute https:// or http:// URLs (including Cloudinary) untouched.
 * - Flags and rejects obsolete filesystem paths (/opt/render/..., backend/uploads/...).
 * - Never prepends the backend/media URL to an already absolute URL.
 */
export function resolveMediaUrl(path?: string | null): string {
  if (!path || typeof path !== 'string' || !path.trim()) return '';
  const trimmed = path.trim();

  // Already a full HTTP/HTTPS URL (e.g. Cloudinary, Supabase, external)
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  const normalized = trimmed.replace(/\\/g, '/');

  // Obsolete server filesystem paths from previous local disk storage
  if (
    normalized.includes('/opt/render/') ||
    normalized.startsWith('backend/uploads/') ||
    normalized.includes('/backend/uploads/') ||
    /^[a-zA-Z]:[\\/]/.test(trimmed)
  ) {
    return '';
  }

  // In production, Render's ephemeral filesystem wipes any local /uploads/...
  if (isProduction && (normalized.startsWith('/uploads/') || normalized.startsWith('uploads/'))) {
    return '';
  }

  // Local development fallback
  const cleanMedia = MEDIA_URL.replace(/\/+$/, '');
  const cleanPath = normalized.startsWith('/') ? normalized : `/${normalized}`;
  return `${cleanMedia}${cleanPath}`;
}

/**
 * Returns true if a resume path cannot be resolved to a real file.
 * Any path that is not an active HTTPS/HTTP URL is unrecoverable in production
 * (e.g., old Render filesystem paths /opt/render/..., backend/uploads/..., or local uploads
 * from before the Cloudinary migration).
 */
export function isUnrecoverableResumePath(path?: string | null): boolean {
  if (!path || typeof path !== 'string' || !path.trim()) return false;
  const trimmed = path.trim();

  // Valid remote URL (Cloudinary, Supabase, etc.)
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return false;
  }

  // Any non-http(s) path in production or any obsolete filesystem path is unrecoverable
  return true;
}

/**
 * Resolves a resume URL for inline viewing (iframe / preview / open in new tab).
 * - Cloudinary raw PDF URLs are adjusted with `fl_inline` so browsers view them
 *   inline with Content-Type: application/pdf instead of forcing a raw download.
 * - Obsolete paths return an empty string to prevent broken URLs.
 */
export function resolveResumeUrl(path?: string | null): string {
  if (!path || typeof path !== 'string' || !path.trim()) return '';
  if (isUnrecoverableResumePath(path)) return '';

  const trimmed = path.trim();

  if (trimmed.startsWith('https://res.cloudinary.com/')) {
    // For Cloudinary raw PDF deliveries, ensure fl_inline flag is present for inline rendering
    if (trimmed.includes('/raw/upload/') && !trimmed.includes('/raw/upload/fl_inline/')) {
      return trimmed.replace('/raw/upload/', '/raw/upload/fl_inline/');
    }
    return trimmed;
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  return resolveMediaUrl(trimmed);
}

/**
 * Formats a resume URL for download with an optional custom filename.
 * Uses Cloudinary `fl_attachment` to guarantee clean browser downloads without CORS blocks.
 */
export function getResumeDownloadUrl(path?: string | null, filename?: string): string {
  if (!path || typeof path !== 'string' || !path.trim()) return '';
  if (isUnrecoverableResumePath(path)) return '';

  const trimmed = path.trim();

  if (trimmed.startsWith('https://res.cloudinary.com/')) {
    const safeName = filename
      ? encodeURIComponent(filename.replace(/[/\\?%*:|"<>]/g, '_'))
      : '';
    const flag = safeName ? `fl_attachment:${safeName}` : 'fl_attachment';

    if (trimmed.includes('/raw/upload/')) {
      return trimmed.replace(/\/raw\/upload\/(fl_inline\/)?/, `/raw/upload/${flag}/`);
    }
    if (trimmed.includes('/image/upload/')) {
      return trimmed.replace(/\/image\/upload\/(fl_inline\/)?/, `/image/upload/${flag}/`);
    }
  }

  return resolveResumeUrl(trimmed);
}