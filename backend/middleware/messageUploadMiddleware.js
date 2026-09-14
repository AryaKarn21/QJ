const multer = require("multer");

// In-memory storage — messageController.sendMessage hands each buffer to
// services/media.service.js (persistUpload), same pattern as
// userUploadMiddleware.js. Never touches local disk directly, so this works
// unchanged on Render's ephemeral filesystem.
const storage = multer.memoryStorage();

// Photos + the common "share a file" document types. Anything not in this
// list is rejected at the multer layer before it ever reaches Cloudinary,
// so media.service.js can trust the mimetype for message attachments.
const allowedTypes = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "text/plain",
];

const fileFilter = (req, file, cb) => {
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Unsupported file type. Allowed: images, PDF, Word/Excel docs, ZIP, or plain text."), false);
  }
};

// 15MB/file covers photos and most shared documents without letting the
// chat become a general-purpose large-file host; up to 4 at once per message.
const messageUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 15 * 1024 * 1024, files: 4 },
}).array("attachments", 4);

// Only kicks in for multipart/form-data requests (attachments present) —
// a plain JSON { text } send never hits multer's parser at all, so
// existing text-only callers are unaffected. Mirrors the JSON error shape
// handleCommunityUpload already established.
function handleMessageUpload(req, res, next) {
  if (!req.is("multipart/form-data")) return next();
  messageUpload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
}

module.exports = handleMessageUpload;
