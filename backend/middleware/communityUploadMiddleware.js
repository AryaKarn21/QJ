const multer = require("multer");

// In-memory storage — postController hands each buffer to
// services/media.service.js (persistUpload), matching messageUploadMiddleware
// and applicationUploadMiddleware. Never relies on local disk in production,
// so media persists reliably to Cloudinary CDN across restarts.
const storage = multer.memoryStorage();

const allowedTypes = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "application/pdf",
];

const fileFilter = (req, file, cb) => {
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Unsupported file type. Allowed: JPG, PNG, GIF, WEBP, MP4, MOV, WEBM, PDF."), false);
  }
};

// 50MB ceiling covers short video clips; images/PDFs are smaller.
const communityUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024, files: 6 },
}).array("media", 6);

// Handles multipart requests when media is present. Passes through non-multipart
// JSON requests (e.g. text-only post updates) directly to next().
function handleCommunityUpload(req, res, next) {
  if (!req.is("multipart/form-data")) return next();

  communityUpload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
}

module.exports = handleCommunityUpload;