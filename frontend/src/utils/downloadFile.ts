import { getResumeDownloadUrl } from './mediaUrl';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://qj.onrender.com';

/**
 * Downloads a remote file with a chosen filename.
 * 1. If applicationId is provided, attempts authorized backend proxy download
 *    with candidate-specific Content-Disposition filename and zero CORS errors.
 * 2. If direct fetch succeeds, creates a local blob object URL.
 * 3. Seamlessly falls back to direct browser navigation with clean URL.
 */
export async function downloadFile(
  url: string,
  filename: string,
  applicationId?: string
): Promise<void> {
  if (!url && !applicationId) throw new Error('No URL or application ID provided for download.');

  const safeFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  const token = localStorage.getItem('token');

  // Strategy 1: Authorized backend proxy (avoids Cloudinary CORS restrictions)
  if (applicationId) {
    try {
      const cleanBase = API_BASE_URL.replace(/\/+$/, '');
      const proxyEndpoint = `${cleanBase}/api/employer/applications/${applicationId}/resume?download=true`;
      const response = await fetch(proxyEndpoint, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (response.ok) {
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = safeFilename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
        return;
      }
    } catch (err) {
      console.warn('Backend proxy download failed, falling back to direct URL:', err);
    }
  }

  // Strategy 2: Direct fetch blob from resolved clean URL
  const downloadUrl = getResumeDownloadUrl(url, safeFilename) || url;
  try {
    const response = await fetch(downloadUrl);
    if (response.ok) {
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = safeFilename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
      return;
    }
  } catch (err) {
    console.warn('Direct blob fetch blocked (likely CORS), falling back to browser navigation:', err);
  }

  // Strategy 3: Browser anchor fallback
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = safeFilename;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

