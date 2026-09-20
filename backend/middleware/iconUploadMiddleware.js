const multer = require('multer');

// In-memory storage — persistUpload() (services/media.service.js) reads
// file.buffer to upload to Cloudinary or write to local disk itself
// (choosing the filename/extension there via safeUploadExtension.js, same
// as every other upload in this app: applicationUploadMiddleware.js,
// userUploadMiddleware.js). This used to be multer.diskStorage writing
// straight into backend/uploads/icons/ with its own filename — which
// never gave req.file a .buffer at all, so persistUpload() received
// `undefined` and either corrupted the Cloudinary upload or threw
// writing it to disk. See applicationUploadMiddleware.js's comment for
// the identical history on the resume-upload path.
const storage = multer.memoryStorage();

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
    cb(new Error('Only "icon" field is allowed for category uploads.'), false);
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
      const msg = 'Icon image is too large. Please choose a file under 1MB.';
      return res.status(400).json({ message: msg, error: msg });
    }
    // Every other case (bad field name, disallowed mimetype, ...) already
    // carries a specific, safe-to-show message from fileFilter/filename above.
    const msg = err.message || 'Failed to upload icon.';
    return res.status(400).json({ message: msg, error: msg });
  });
}

module.exports = handleIconUpload;