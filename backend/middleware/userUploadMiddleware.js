const multer = require('multer');

// In-memory storage — the controller (via services/media.service.js)
// decides what happens to the buffer: uploaded to Supabase Storage when
// configured, or written to local disk exactly as before when it isn't.
// This used to be multer.diskStorage writing straight into
// backend/uploads/<folder>/ — that's what made every profile pic/company
// logo/cover photo/resume disappear on Render's ephemeral filesystem the
// moment the dyno restarted; the file itself never left this process
// until media.service.js decides where it's actually going.
const storage = multer.memoryStorage();

// 2. Configure File Filter
// We control which file types are allowed.
const fileFilter = (req, file, cb) => {
  // webp added alongside the pre-existing types — safeUploadExtension.js
  // already recognized image/webp, this filter just hadn't caught up.
  const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  const allowedResumeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  if (file.fieldname === 'profilePic' || file.fieldname === 'companyLogo' || file.fieldname === 'coverPhoto') {
    if (allowedImageTypes.includes(file.mimetype)) {
      cb(null, true); // Accept the file
    } else {
      cb(new Error('Invalid image type. Only JPEG, JPG, PNG, WEBP, or GIF are allowed.'), false);
    }
  } else if (file.fieldname === 'resume') {
    if (allowedResumeTypes.includes(file.mimetype)) {
      cb(null, true); // Accept the file
    } else {
      cb(new Error('Invalid resume type. Only PDF, DOC, or DOCX documents are allowed.'), false);
    }
  } else {
    // This case should not happen with the .fields setup, but as a fallback
    cb(new Error('Invalid fieldname for file upload.'), false);
  }
};

// 3. Create and Export the Middleware
// We combine the storage, filter, and field definitions into one middleware.
const userUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit for resumes and media
}).fields([
  { name: 'profilePic', maxCount: 1 },
  { name: 'resume', maxCount: 1 },
  { name: 'companyLogo', maxCount: 1 },
  { name: 'coverPhoto', maxCount: 1 }
]);

module.exports = userUpload;
