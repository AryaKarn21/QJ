// Same MEDIA_URL-prefixing convention already used throughout
// components/admin/* (e.g. UserManagement.tsx) — uploaded file paths come
// back from the API as root-relative ("/uploads/..."), and need the
// backend's origin prefixed since the frontend is served from a different
// origin/port.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://qj.onrender.com';
const MEDIA_URL = import.meta.env.VITE_MEDIA_URL || API_BASE_URL;

export function resolveMediaUrl(path?: string | null): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${MEDIA_URL}${path}`;
}

/**
 * Same as resolveMediaUrl, plus recovery for legacy application-resume
 * records saved before the resume-upload fix: those stored the server's
 * own absolute filesystem path (e.g.
 * "/opt/render/project/src/backend/uploads/applications/xyz.pdf") instead
 * of a fetchable URL, because the old upload middleware used disk storage
 * and saved multer's req.file.path directly. New uploads never hit the
 * fallback branch below — persistUpload() always returns either a
 * Cloudinary URL or a root-relative "/uploads/..." path.
 */
export function resolveResumeUrl(path?: string | null): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const normalized = path.replace(/\\/g, '/');
  const uploadsIndex = normalized.indexOf('/uploads/');
  const relative = uploadsIndex !== -1 ? normalized.slice(uploadsIndex) : normalized;
  return resolveMediaUrl(relative.startsWith('/') ? relative : `/${relative}`);
}

/**
 * True for a resume value that can never resolve to a real file, even
 * after resolveResumeUrl's /uploads/ recovery — the record was saved as
 * an absolute filesystem path (Render: "/opt/render/...", or a local dev
 * Windows path like "C:\\Users\\...") from before the Cloudinary fix, AND
 * that file no longer exists because Render's disk is wiped on every
 * redeploy. There's nothing to fetch; the candidate needs to re-apply.
 * Use this to show a friendly "unavailable" state instead of sending the
 * employer to a raw 404 page.
 */
export function isUnrecoverableResumePath(path?: string | null): boolean {
  if (!path) return false;
  if (path.startsWith('http://') || path.startsWith('https://')) return false;
  const normalized = path.replace(/\\/g, '/');
  // A healthy stored value is always root-relative: "/uploads/...".
  // Anything else (a Windows drive letter, or an absolute *nix path with
  // more segments before "uploads/") is a pre-fix legacy record.
  return !normalized.startsWith('/uploads/');
}