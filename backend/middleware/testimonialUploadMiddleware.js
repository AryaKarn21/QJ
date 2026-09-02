const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { safeExtensionFor } = require('./safeUploadExtension');

// backend/uploads/ is entirely gitignored, so this folder isn't guaranteed
// to exist on a fresh clone/deploy — ensure it up front (same fix applied
// to advertisementUploadMiddleware.js/userUploadMiddleware.js after the
// cover-photo upload crashed with an opaque ENOENT for exactly this reason).
const UPLOAD_DIR = path.join(__dirname, '../uploads/testimonials');
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
  if (file.fieldname !== 'avatar') {
    return cb(new Error('Invalid fieldname for testimonial upload.'), false);
  }
  if (!allowedImageTypes.includes(file.mimetype)) {
    return cb(new Error('Invalid image type. Only JPEG, JPG, PNG, or WEBP are allowed.'), false);
  }
  cb(null, true);
};

// Avatar photo is optional (unlike the advertisement banner image), so
// this is wired up with .single('avatar') and the controller simply
// doesn't require req.file to be present.
const testimonialUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB — small headshot, same cap as other profile-style avatars
}).single('avatar');

module.exports = testimonialUpload;
