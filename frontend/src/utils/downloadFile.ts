import { getResumeDownloadUrl } from './mediaUrl';

/**
 * Downloads a remote file with a chosen filename.
 * Tries fetching blob object URL first (giving full control over filename);
 * if browser CORS restrictions block fetch, seamlessly falls back to
 * direct browser navigation via Cloudinary's fl_attachment flag.
 */
export async function downloadFile(url: string, filename: string): Promise<void> {
  if (!url) throw new Error('No URL provided for download.');

  try {
    const downloadUrl = getResumeDownloadUrl(url, filename) || url;
    const response = await fetch(downloadUrl);
    if (!response.ok) throw new Error(`Failed to fetch file (${response.status})`);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  } catch (err) {
    // Fallback: direct browser download via Cloudinary fl_attachment or anchor
    const downloadUrl = getResumeDownloadUrl(url, filename) || url;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
}
