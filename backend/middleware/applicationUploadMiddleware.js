const multer = require('multer');

// In-memory storage — same fix as userUploadMiddleware.js (see its comment
// for the full story): this used to be multer.diskStorage writing straight
// into backend/uploads/applications/, which saved req.file.path — an
// absolute filesystem path like /opt/render/project/src/backend/uploads/...
// — directly onto the Application document. That path is never reachable
// over HTTP, so "View Resume" on the employer side opened a 404 ("Cannot
// GET /opt/render/..."). The controller (jobController.js's applyInJob)
// now runs the buffer through services/media.service.js's persistUpload,
// same as every other upload in this app, which returns a real public URL.
const storage = multer.memoryStorage();

// File Filter for Resume Only
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

const applicationUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
}).single('resume');

module.exports = applicationUpload;
