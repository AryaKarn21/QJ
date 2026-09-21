// Centralized media and resume URL resolution utilities.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://qj.onrender.com';
const MEDIA_URL = import.meta.env.VITE_MEDIA_URL || API_BASE_URL;

const _isProduction =
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

  // Resolve relative upload paths against the backend/media host
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

  const normalized = trimmed.replace(/\\/g, '/');

  // Hard disk or obsolete server paths that are definitely broken
  if (
    normalized.includes('/opt/render/') ||
    normalized.startsWith('backend/uploads/') ||
    normalized.includes('/backend/uploads/') ||
    /^[a-zA-Z]:[\\/]/.test(trimmed)
  ) {
    return true;
  }

  // Active relative /uploads path served by backend
  if (normalized.startsWith('/uploads/') || normalized.startsWith('uploads/')) {
    return false;
  }

  return false;
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
    // Cloudinary raw uploads do NOT support transformation flags like fl_inline (returns 400 Bad Request)
    if (trimmed.includes('/raw/upload/')) {
      return trimmed.replace(/\/raw\/upload\/(fl_inline\/|fl_attachment[^/]*\/)?/, '/raw/upload/');
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
 * Uses Cloudinary `fl_attachment` on image uploads, and clean URLs on raw uploads.
 */
export function getResumeDownloadUrl(path?: string | null, filename?: string): string {
  if (!path || typeof path !== 'string' || !path.trim()) return '';
  if (isUnrecoverableResumePath(path)) return '';

  const trimmed = path.trim();

  if (trimmed.startsWith('https://res.cloudinary.com/')) {
    // Raw files cannot be transformed in Cloudinary (returns 400 Bad Request)
    if (trimmed.includes('/raw/upload/')) {
      return trimmed.replace(/\/raw\/upload\/(fl_inline\/|fl_attachment[^/]*\/)?/, '/raw/upload/');
    }

    if (trimmed.includes('/image/upload/')) {
      const safeName = filename
        ? encodeURIComponent(filename.replace(/[/\\?%*:|"<>]/g, '_'))
        : '';
      const flag = safeName ? `fl_attachment:${safeName}` : 'fl_attachment';
      return trimmed.replace(/\/image\/upload\/(fl_inline\/)?/, `/image/upload/${flag}/`);
    }
  }

  return resolveResumeUrl(trimmed);
}

/**
 * Returns an authorized backend delivery URL for an application resume.
 * This guarantees the request is signed and streamed directly by our server,
 * bypassing any Cloudinary security restrictions ("deny or ACL failure" / 401).
 */
export function getAuthorizedApplicationResumeUrl(applicationId?: string, download = false): string {
  if (!applicationId) return '';
  const token = localStorage.getItem('token') || '';
  const cleanBase = API_BASE_URL.replace(/\/+$/, '');
  const params = new URLSearchParams();
  if (token) params.set('token', token);
  if (download) params.set('download', 'true');
  const qs = params.toString();
  return `${cleanBase}/api/employer/applications/${applicationId}/resume${qs ? `?${qs}` : ''}`;
}