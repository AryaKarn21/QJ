// Same MEDIA_URL-prefixing convention already used throughout
// components/admin/* (e.g. UserManagement.tsx) — uploaded file paths come
// back from the API as root-relative ("/uploads/..."), and need the
// backend's origin prefixed since the frontend is served from a different
// origin/port.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const MEDIA_URL = import.meta.env.VITE_MEDIA_URL || API_BASE_URL;

export function resolveMediaUrl(path?: string | null): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${MEDIA_URL}${path}`;
}