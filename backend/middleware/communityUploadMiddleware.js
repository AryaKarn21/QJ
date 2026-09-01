const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const { safeExtensionFor } = require("./safeUploadExtension");

// Community post media: images, videos, and PDFs (matches the "text,
// image, video, PDF, job, poll, hiring" post types in the spec). Mirrors
// middleware/userUploadMiddleware.js's disk-storage/uuid pattern, in its
// own file (rather than extending that one) because post media has very
// different size limits than a 2MB profile picture/resume.
const uploadRoot = path.join(__dirname, "../uploads/community");
["images", "videos", "documents"].forEach((sub) => {
  const dir = path.join(uploadRoot, sub);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = "images";
    if (file.mimetype.startsWith("video/")) folder = "videos";
    else if (file.mimetype === "application/pdf") folder = "documents";
    cb(null, path.join(uploadRoot, folder));
  },
  filename: (req, file, cb) => {
    // Extension is derived from the validated mimetype, never from the
    // client-supplied original filename — see safeUploadExtension.js.
    const ext = safeExtensionFor(file.mimetype);
    if (!ext) {
      return cb(new Error("Unsupported file type."));
    }
    cb(null, `${uuidv4()}${ext}`);
  },
});

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

// 50MB ceiling covers short video clips; images/PDFs will always be far
// smaller in practice. Enforced per-file by multer regardless of type.
const communityUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024, files: 6 },
}).array("media", 6);

// Wraps multer's callback-style error handling into the same
// {message: "..."} JSON shape the rest of the API already returns, so the
// frontend doesn't need special-case handling for upload errors.
function handleCommunityUpload(req, res, next) {
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