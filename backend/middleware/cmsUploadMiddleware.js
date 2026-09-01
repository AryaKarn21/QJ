const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const { safeExtensionFor } = require("./safeUploadExtension");

// Images embedded inside CMS rich-text content (Pages, Career Tips, Legal
// pages) via the ReactQuill toolbar's "attachment" (image) button. Mirrors
// the disk-storage/uuid/self-healing-dir pattern already used by
// userUploadMiddleware.js and communityUploadMiddleware.js — kept in its
// own file since this is a distinct upload surface (admin-only, embedded
// in HTML content rather than attached to a user/post document).
const uploadDir = path.join(__dirname, "../uploads/cms");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Self-healing: the whole uploads/ tree is gitignored, so this
    // directory won't exist on a fresh clone until the first upload.
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Extension derived from the validated mimetype, never the client-
    // supplied filename — see safeUploadExtension.js.
    const ext = safeExtensionFor(file.mimetype);
    if (!ext) {
      return cb(new Error("Unsupported file type."));
    }
    cb(null, `${uuidv4()}${ext}`);
  },
});

const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];

const fileFilter = (req, file, cb) => {
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Unsupported file type. Allowed: JPG, PNG, GIF, WEBP."), false);
  }
};

// 5MB covers any in-content illustration/screenshot without letting an
// admin accidentally balloon a single blog/page image.
const cmsImageUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).single("image");

// Wraps multer's callback-style error handling into the same
// {message: "..."} JSON shape the rest of the API returns.
function handleCmsImageUpload(req, res, next) {
  cmsImageUpload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
}

module.exports = handleCmsImageUpload;
