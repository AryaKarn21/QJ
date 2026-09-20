const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const { safeExtensionFor } = require("./safeUploadExtension");

// In-memory storage: persistUpload() (services/media.service.js) reads
// file.buffer to upload to Cloudinary (or fallback to local disk in dev).
// Switched from multer.diskStorage so CMS uploads do not depend on Render's
// ephemeral local filesystem and are permanently stored in Cloudinary.
const storage = multer.memoryStorage();

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
