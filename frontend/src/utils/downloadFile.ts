/**
 * Downloads a remote file with a chosen filename. A plain
 * `<a href=url download="name.pdf">` only honors the suggested filename
 * for same-origin URLs — resumes are served from Cloudinary (a different
 * origin than the frontend), so browsers ignore `download` there and
 * either navigate to the PDF or save it under Cloudinary's own generated
 * name. Fetching the bytes and downloading via a Blob object URL works
 * regardless of origin, as long as the response allows CORS reads (which
 * Cloudinary's public delivery URLs do).
 */
export async function downloadFile(url: string, filename: string): Promise<void> {
  const response = await fetch(url);
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
}
