const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { safeExtensionFor } = require('./safeUploadExtension');

// Ensure the upload destination folder exists at startup
const UPLOAD_DIR = path.join(__dirname, '../uploads/applications');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// 1. Configure Storage for Applications
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // Extension is derived from the validated mimetype, never from the
    // client-supplied original filename — see safeUploadExtension.js.
    const ext = safeExtensionFor(file.mimetype);
    if (!ext) {
      return cb(new Error('Invalid resume type. Only PDF is allowed.'));
    }
    cb(null, `${uuidv4()}${ext}`);
  },
});

// 2. File Filter for Resume Only
const fileFilter = (req, file, cb) => {
  const allowedResumeTypes = ['application/pdf'];

  if (file.fieldname === 'resume') {
    if (allowedResumeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid resume type. Only PDF is allowed.'), false);
    }
  } else {
    cb(new Error('Only resume field is allowed for application upload.'), false);
  }
};

// 3. Export Middleware for Application Uploads
const applicationUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
}).single('resume');

module.exports = applicationUpload;