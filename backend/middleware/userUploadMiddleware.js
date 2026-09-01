const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { safeExtensionFor } = require('./safeUploadExtension');

// 1. Configure Storage
// We define where files should be stored and how they should be named.
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = '';
    if (file.fieldname === 'profilePic') {
      folder = 'profile_pics'; // Dedicated folder for profile pictures
    } else if (file.fieldname === 'companyLogo') {
      folder = 'company_logos'; // Dedicated folder for company logos
    }

    else if (file.fieldname === 'coverPhoto') {
     folder = 'cover_photos';
    }

    else if (file.fieldname === 'resume') {
      folder = 'resumes'; // Resumes folder for jobseekers resumes
    }
    // The destination path is relative to the project root. multer never
    // creates this directory itself — since `backend/uploads/` is entirely
    // gitignored (see backend/.gitignore), a subfolder like "cover_photos"
    // simply doesn't exist on a fresh clone/deploy until something creates
    // it, and multer's write then fails with ENOENT, surfaced to the
    // client as an opaque 500. Creating it here on first use makes every
    // upload field self-healing instead of depending on someone having
    // manually mkdir'd every folder in advance.
    const dir = path.join(__dirname, `../uploads/${folder}`);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // Extension is derived from the validated mimetype, never from the
    // client-supplied original filename — see safeUploadExtension.js.
    const ext = safeExtensionFor(file.mimetype);
    if (!ext) {
      return cb(new Error('Invalid file type.'));
    }
    cb(null, `${uuidv4()}${ext}`);
  },
});

// 2. Configure File Filter
// We control which file types are allowed.
const fileFilter = (req, file, cb) => {
  // webp added alongside the pre-existing types — safeUploadExtension.js
  // already recognized image/webp, this filter just hadn't caught up.
  const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  const allowedResumeTypes = ['application/pdf'];

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
      cb(new Error('Invalid resume type. Only PDF is allowed.'), false);
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
  limits: { fileSize: 2 * 1024 * 1024 } // 2MB limit for any file
}).fields([
  { name: 'profilePic', maxCount: 1 },
  { name: 'resume', maxCount: 1 },
  { name: 'companyLogo', maxCount: 1 },
   { name: 'coverPhoto', maxCount: 1 }
]);

module.exports = userUpload;