const multer = require("multer");

// In-memory storage: persistUpload() (services/media.service.js) reads
// file.buffer to upload to Cloudinary (or fallback to local disk in dev).
const storage = multer.memoryStorage();

const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];

const fileFilter = (req, file, cb) => {
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid image type. Only JPG, JPEG, PNG, WEBP, and GIF are allowed."), false);
  }
};

const blogImageUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
}).single("image");

function handleBlogImageUpload(req, res, next) {
  blogImageUpload(req, res, (err) => {
    if (!err) return next();
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "Image is too large. Please choose a file under 5MB." });
    }
    return res.status(400).json({ message: err.message || "Failed to upload image." });
  });
}

module.exports = handleBlogImageUpload;
