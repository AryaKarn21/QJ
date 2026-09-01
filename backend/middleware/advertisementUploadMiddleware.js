const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { safeExtensionFor } = require('./safeUploadExtension');

// backend/uploads/ is entirely gitignored, so this folder isn't guaranteed
// to exist on a fresh clone/deploy — ensure it up front (same fix applied
// to userUploadMiddleware.js/iconUploadMiddleware.js after the cover-photo
// upload crashed with an opaque ENOENT for exactly this reason).
const UPLOAD_DIR = path.join(__dirname, '../uploads/advertisements');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    // Extension is derived from the validated mimetype, never from the
    // client-supplied original filename — see safeUploadExtension.js.
    const ext = safeExtensionFor(file.mimetype);
    if (!ext) {
      return cb(new Error('Invalid image type. Only JPEG, JPG, PNG, or WEBP are allowed.'));
    }
    cb(null, `${uuidv4()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (file.fieldname !== 'image') {
    return cb(new Error('Invalid fieldname for advertisement upload.'), false);
  }
  if (!allowedImageTypes.includes(file.mimetype)) {
    return cb(new Error('Invalid image type. Only JPEG, JPG, PNG, or WEBP are allowed.'), false);
  }
  cb(null, true);
};

const advertisementUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB — banner images, a bit more generous than the 2MB profile-asset limit
}).single('image');

module.exports = advertisementUpload;
