// Maps a validated MIME type to a safe, fixed file extension.
//
// We never trust the client-supplied original filename for the extension
// (that's how you get path traversal / double-extension tricks like
// "resume.pdf.exe"). Instead every upload middleware calls
// safeExtensionFor(file.mimetype) — which only recognizes an explicit
// allow-list of MIME types — and uses that extension with a fresh uuid
// filename. Unknown/unexpected mimetypes return null so the caller can
// reject the upload.
const MIME_TO_EXT = {
  // Images
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",

  // Documents
  "application/pdf": ".pdf",

  // Community post videos
  "video/mp4": ".mp4",
  "video/quicktime": ".mov",
  "video/webm": ".webm",
};

function safeExtensionFor(mimetype) {
  return MIME_TO_EXT[mimetype] || null;
}

module.exports = { safeExtensionFor };