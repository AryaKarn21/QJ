const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { safeExtensionFor } = require('./safeUploadExtension');

// backend/uploads/ is entirely gitignored, so this folder isn't guaranteed
// to exist on a fresh clone/deploy — ensure it up front rather than
// crashing the first upload with an opaque ENOENT-turned-500.
const UPLOAD_DIR = path.join(__dirname, '../uploads/icons');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// 1. Configure Storage for Icons
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // Extension is derived from the validated mimetype, never from the
    // client-supplied original filename — see safeUploadExtension.js.
    const ext = safeExtensionFor(file.mimetype);
    if (!ext) {
      return cb(new Error('Invalid icon type. Only JPEG, PNG, JPG, and WEBP are allowed.'));
    }
    cb(null, `${uuidv4()}${ext}`);
  },
});

// 2. File Filter for Icons Only
const fileFilter = (req, file, cb) => {
  const allowedIconTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];

  if (file.fieldname === 'icon') {
    if (allowedIconTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid icon type. Only JPEG, PNG, JPG, and WEBP are allowed.'), false);
    }
  } else {
    cb(new Error('Only "icon" field is allowed for job category uploads.'), false);
  }
};

// 3. Export Middleware for Icon Uploads
const iconUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 1 * 1024 * 1024 }, // 1MB max
}).single('icon');

// Multer/busboy errors (oversized file, bad field name, a malformed
// multipart boundary, ...) are passed to Express's `next(err)`, which —
// unless something here catches it — falls through to server.js's global
// error handler. That handler is correct to hide a *real* server error's
// detail from the client, but it made every one of these into an opaque
// "Something went wrong. Please try again." 500, indistinguishable from
// an actual bug. A photo straight off a phone routinely runs several MB,
// so hitting the 1MB limit here is a completely ordinary, expected
// outcome — the admin needs to see that, not a generic crash message.
// Mirrors the same catch-multer-errors-and-respond-4xx pattern already
// used by middleware/cmsUploadMiddleware.js and
// middleware/communityUploadMiddleware.js.
function handleIconUpload(req, res, next) {
  iconUpload(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Icon image is too large. Please choose a file under 1MB.' });
    }
    // Every other case (bad field name, disallowed mimetype, ...) already
    // carries a specific, safe-to-show message from fileFilter/filename above.
    return res.status(400).json({ error: err.message || 'Failed to upload icon.' });
  });
}

module.exports = handleIconUpload;