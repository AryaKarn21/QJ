/**
 * services/media.service.js
 *
 * Persistent file storage via Cloudinary.
 * Free tier: 25 GB storage + 25 GB bandwidth/month — plenty for a job portal.
 * All URLs are permanent https:// links served from Cloudinary's CDN.
 *
 * Required env vars (add to Render dashboard):
 *   CLOUDINARY_CLOUD_NAME  — from Cloudinary Dashboard → Settings → General
 *   CLOUDINARY_API_KEY     — from Cloudinary Dashboard → Settings → API Keys
 *   CLOUDINARY_API_SECRET  — from Cloudinary Dashboard → Settings → API Keys
 *
 * Falls back to local disk when env vars are missing, so local dev works
 * without any cloud credentials.
 *
 * Controllers (jobseekerController, employerController, userController)
 * call ONLY persistUpload() and deleteStoredFile() — nothing else changes.
 */

const fs   = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const cloudinary = require("cloudinary").v2;
const { safeExtensionFor } = require("../middleware/safeUploadExtension");

const IS_CONFIGURED = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY    &&
  process.env.CLOUDINARY_API_SECRET
);

if (IS_CONFIGURED) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
} else {
  console.warn(
    "[media.service] Cloudinary is not configured — uploads fall back to local disk.\n" +
    "Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your environment."
  );
}

const FOLDER_MAP = {
  profile_pics:  "qj/profiles",
  cover_photos:  "qj/cover-photos",
  company_logos: "qj/company-logos",
  resumes:       "qj/resumes",
  message_attachments: "qj/messages",
  // Job/blog category icons and blog post images used to be saved with
  // multer's plain disk storage straight into backend/uploads/ — which,
  // like every other upload before the Cloudinary migration, disappears
  // the moment Render's ephemeral filesystem restarts. Routed through
  // persistUpload() below like everything else now.
  job_category_icons:  "qj/job-category-icons",
  blog_category_icons: "qj/blog-category-icons",
  blog_images:          "qj/blog-images",
};

const ANY_TYPE_FOLDERS = new Set(["message_attachments"]);

function isCloudinaryUrl(stored) {
  return typeof stored === "string" && stored.startsWith("https://res.cloudinary.com/");
}

function isSupabaseUrl(stored) {
  return typeof stored === "string" && stored.includes(".supabase.co/storage/");
}

function writeBufferToLocalDisk(buffer, mimetype, folder) {
  const ext = safeExtensionFor(mimetype);
  if (!ext) throw new Error("Invalid file type.");
  const dir = path.join(__dirname, `../uploads/${folder}`);
  fs.mkdirSync(dir, { recursive: true });
  const filename = `${uuidv4()}${ext}`;
  fs.writeFileSync(path.join(dir, filename), buffer);
  return `/uploads/${folder}/${filename}`;
}

async function uploadToCloudinary(buffer, mimetype, folder, ownerId) {
  const isImage   = mimetype.startsWith("image/");
  const isPdf     = mimetype === "application/pdf";
  if (!isImage && !isPdf && !ANY_TYPE_FOLDERS.has(folder)) throw new Error("Invalid file type.");

  const resourceType = isImage ? "image" : "raw";
  const ext          = safeExtensionFor(mimetype);
  const cloudFolder  = FOLDER_MAP[folder] || `qj/${folder}`;
  const publicId = resourceType === "raw" && ext
    ? `${cloudFolder}/${ownerId || "misc"}/${uuidv4()}${ext}`
    : `${cloudFolder}/${ownerId || "misc"}/${uuidv4()}`;

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: resourceType,
        public_id:     publicId,
        use_filename:  false,
        overwrite:     false,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

function publicIdFromCloudinaryUrl(url) {
  try {
    const clean    = url.split("?")[0];
    const marker   = "/upload/";
    const idx      = clean.indexOf(marker);
    if (idx === -1) return null;
    let rest = clean.slice(idx + marker.length);
    rest = rest.replace(/^v\d+\//, "");
    const dotIdx = rest.lastIndexOf(".");
    if (dotIdx !== -1) rest = rest.slice(0, dotIdx);
    return rest;
  } catch {
    return null;
  }
}

async function persistUpload(file, folder, ownerId) {
  if (IS_CONFIGURED) {
    return uploadToCloudinary(file.buffer, file.mimetype, folder, ownerId);
  }
  return writeBufferToLocalDisk(file.buffer, file.mimetype, folder);
}

async function deleteStoredFile(stored) {
  if (!stored) return;
  try {
    if (isCloudinaryUrl(stored)) {
      if (!IS_CONFIGURED) return;
      const publicId = publicIdFromCloudinaryUrl(stored);
      if (!publicId) return;

      const resourceType = stored.includes("/raw/upload/") ? "raw" : "image";
      await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });

    } else if (isSupabaseUrl(stored)) {
      console.info(`[media.service] Skipping legacy Supabase file: ${stored}`);

    } else {
      const filePath = path.join(__dirname, "..", stored);
      await fs.promises.unlink(filePath);
    }
  } catch (err) {
    console.error(`[media.service] Failed to delete stored file (${stored}):`, err.message);
  }
}

module.exports = {
  IS_CONFIGURED,
  persistUpload,
  deleteStoredFile,
  isCloudinaryUrl,
  isSupabaseUrl,
};