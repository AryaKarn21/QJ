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

// ── Configuration check ───────────────────────────────────────────────────────
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
    secure: true,   // always https://
  });
} else {
  console.warn(
    "[media.service] Cloudinary is not configured — uploads fall back to local disk.\n" +
    "Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your environment."
  );
}

// ── Folder mapping ────────────────────────────────────────────────────────────
// Organises uploads inside your Cloudinary account by type.
// Resumes (PDFs) go to a separate raw folder since they are not images.
const FOLDER_MAP = {
  profile_pics:  "qj/profiles",
  cover_photos:  "qj/cover-photos",
  company_logos: "qj/company-logos",
  resumes:       "qj/resumes",      // stored as raw resource
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function isCloudinaryUrl(stored) {
  return typeof stored === "string" && stored.startsWith("https://res.cloudinary.com/");
}

function isSupabaseUrl(stored) {
  return typeof stored === "string" && stored.includes(".supabase.co/storage/");
}

/** Local disk fallback — used in dev when Cloudinary env vars are absent. */
function writeBufferToLocalDisk(buffer, mimetype, folder) {
  const ext = safeExtensionFor(mimetype);
  if (!ext) throw new Error("Invalid file type.");
  const dir = path.join(__dirname, `../uploads/${folder}`);
  fs.mkdirSync(dir, { recursive: true });
  const filename = `${uuidv4()}${ext}`;
  fs.writeFileSync(path.join(dir, filename), buffer);
  return `/uploads/${folder}/${filename}`;
}

/**
 * Upload a buffer to Cloudinary and return the secure URL.
 *
 * Images  → resource_type "image" (Cloudinary auto-optimises them)
 * PDFs    → resource_type "raw"   (Cloudinary stores them untouched)
 *
 * public_id is namespaced per owner so no two users can overwrite each other.
 */
async function uploadToCloudinary(buffer, mimetype, folder, ownerId) {
  const isImage   = mimetype.startsWith("image/");
  const isPdf     = mimetype === "application/pdf";
  if (!isImage && !isPdf) throw new Error("Invalid file type.");

  const resourceType = isImage ? "image" : "raw";
  const ext          = safeExtensionFor(mimetype);
  const cloudFolder  = FOLDER_MAP[folder] || `qj/${folder}`;
  const publicId     = `${cloudFolder}/${ownerId || "misc"}/${uuidv4()}`;

  // Cloudinary's upload_stream wraps a callback API — we promisify it here.
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: resourceType,
        public_id:     publicId,
        // Don't append the extension twice — Cloudinary handles it.
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

/**
 * Extract the Cloudinary public_id from a secure_url so we can delete it.
 *
 * Example URL:
 *   https://res.cloudinary.com/<cloud>/image/upload/v1234/qj/profiles/uid/uuid.jpg
 * Extracted public_id:
 *   qj/profiles/uid/uuid
 */
function publicIdFromCloudinaryUrl(url) {
  try {
    // Strip query-string, then take the path after "/upload/"
    const clean    = url.split("?")[0];
    const marker   = "/upload/";
    const idx      = clean.indexOf(marker);
    if (idx === -1) return null;
    let rest = clean.slice(idx + marker.length);
    // Remove the version segment if present (v1234567890/)
    rest = rest.replace(/^v\d+\//, "");
    // Remove the file extension
    const dotIdx = rest.lastIndexOf(".");
    if (dotIdx !== -1) rest = rest.slice(0, dotIdx);
    return rest;
  } catch {
    return null;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Upload one multer memoryStorage file and return the URL/path to store
 * on the Mongoose document.  All controllers call this — signature unchanged.
 *
 * @param {Express.Multer.File} file
 * @param {string} folder   e.g. "profile_pics" | "company_logos" | "cover_photos" | "resumes"
 * @param {string} ownerId  the uploading user's _id (namespaces the storage path)
 * @returns {Promise<string>}
 */
async function persistUpload(file, folder, ownerId) {
  if (IS_CONFIGURED) {
    return uploadToCloudinary(file.buffer, file.mimetype, folder, ownerId);
  }
  return writeBufferToLocalDisk(file.buffer, file.mimetype, folder);
}

/**
 * Delete a previously-stored file.  Never throws — a failed cleanup should
 * never block a successful new upload from saving.
 *
 * Handles:
 *   • Cloudinary URLs  → delete via API
 *   • Supabase URLs    → skip (orphaned, no credentials)
 *   • Local disk paths → unlink
 *
 * @param {string} stored  the value previously returned by persistUpload
 */
async function deleteStoredFile(stored) {
  if (!stored) return;
  try {
    if (isCloudinaryUrl(stored)) {
      if (!IS_CONFIGURED) return; // can't delete without credentials
      const publicId = publicIdFromCloudinaryUrl(stored);
      if (!publicId) return;

      // Determine resource type from the URL path
      const resourceType = stored.includes("/raw/upload/") ? "raw" : "image";
      await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });

    } else if (isSupabaseUrl(stored)) {
      // Orphaned Supabase URL — no credentials anymore, skip silently.
      console.info(`[media.service] Skipping legacy Supabase file: ${stored}`);

    } else {
      // Local disk path e.g. "/uploads/profile_pics/uuid.jpg"
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