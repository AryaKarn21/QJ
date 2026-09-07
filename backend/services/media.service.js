/**
 * services/media.service.js
 *
 * Persistent file storage for uploads (profile pics, company logos, cover
 * photos, resumes) via Supabase Storage — replacing local disk writes,
 * which Render's ephemeral filesystem wipes on every restart/redeploy,
 * and replacing this app's prior Cloudinary integration (removed
 * entirely — no Cloudinary package, config, or calls remain anywhere in
 * this codebase).
 *
 * Guarded the same way Gemini AI degrades gracefully without
 * GEMINI_API_KEY (see utils/geminiClient.js): if SUPABASE_URL/
 * SUPABASE_SERVICE_ROLE_KEY aren't set, this falls back to writing the
 * buffer to local disk exactly as userUploadMiddleware.js always has — a
 * deploy that hasn't configured Supabase yet still works, it just keeps
 * today's non-persistent behavior until it is.
 */

const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const { safeExtensionFor } = require("../middleware/safeUploadExtension");
const { getSupabaseClient, SUPABASE_BUCKET } = require("../config/supabaseClient");

const IS_CONFIGURED = Boolean(
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
);

if (!IS_CONFIGURED) {
  console.warn(
    "Supabase Storage is not configured (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY missing) — " +
    "uploaded files will be written to local disk, which Render (and most PaaS free tiers) " +
    "wipes on every restart/redeploy. Set those two env vars to persist uploads."
  );
}

// The existing local-folder names controllers already pass (unchanged, so
// employerController.js/jobseekerController.js needed no rework beyond
// this migration's ownerId addition) map to the Supabase Storage folder
// names requested for this migration.
const FOLDER_MAP = {
  profile_pics: "profiles",
  cover_photos: "cover-photos",
  company_logos: "company-logos",
  resumes: "resumes",
};

const IMAGE_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
// Matches what userUploadMiddleware.js's fileFilter and safeUploadExtension.js
// actually accept today (PDF only) — not expanding document-type support
// as part of a storage-provider migration.
const DOCUMENT_MIME_TYPES = ["application/pdf"];

/** True for a Supabase-hosted public URL for OUR bucket. */
function isSupabaseUrl(stored) {
  return (
    typeof stored === "string" &&
    !!process.env.SUPABASE_URL &&
    stored.startsWith(process.env.SUPABASE_URL) &&
    stored.includes(`/object/public/${SUPABASE_BUCKET}/`)
  );
}

/**
 * True for a legacy Cloudinary URL from before this migration. Existing
 * records may still have one of these — recognized so deleteStoredFile
 * can skip them cleanly (see its doc comment) and so any future compat
 * check can tell old and new storage apart without guessing.
 */
function isCloudinaryUrl(stored) {
  return typeof stored === "string" && stored.startsWith("https://res.cloudinary.com/");
}

function writeBufferToLocalDisk(buffer, mimetype, folder) {
  const ext = safeExtensionFor(mimetype);
  if (!ext) throw new Error("Invalid file type.");
  const dir = path.join(__dirname, `../uploads/${folder}`);
  fs.mkdirSync(dir, { recursive: true });
  const filename = `${uuidv4()}${ext}`;
  fs.writeFileSync(path.join(dir, filename), buffer);
  // Same root-relative shape every existing controller/frontend already
  // expects (e.g. "/uploads/profile_pics/xyz.png") — unchanged so a
  // deployment without Supabase configured behaves exactly as before.
  return `/uploads/${folder}/${filename}`;
}

/**
 * Returns the public URL for a path already in the bucket. Supabase
 * Storage public URLs are permanent (no expiry, no signing) as long as
 * the bucket is public — the same delivery model Cloudinary's secure_url
 * already used, which is what lets every existing `<img src>` /
 * resolveMediaUrl() call site keep working unchanged.
 */
function getPublicUrl(storagePath) {
  const supabase = getSupabaseClient();
  const { data } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

/**
 * Low-level upload primitive: writes a buffer to `qj-media` at
 * `storagePath` and returns its public URL. Most callers should use
 * persistUpload()/uploadImage()/uploadDocument() below instead — this is
 * exposed for anything that already has an exact storage path in mind.
 */
async function uploadFile(buffer, storagePath, contentType) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.storage.from(SUPABASE_BUCKET).upload(storagePath, buffer, {
    contentType,
    // Filenames are uuid-based (see persistUpload) — a collision would
    // mean something is actually wrong, not "intentionally replace", so
    // this intentionally does NOT set upsert:true.
    upsert: false,
  });
  if (error) throw error;
  return getPublicUrl(storagePath);
}

/** Removes one file from the bucket by its storage path (not its public URL — see storagePathFromPublicUrl). */
async function deleteFile(storagePath) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.storage.from(SUPABASE_BUCKET).remove([storagePath]);
  if (error) throw error;
}

// Recovers the bucket-relative storage path Supabase's delete/list APIs
// need from a public URL previously returned by uploadFile/getPublicUrl —
// the inverse operation. Public URLs look like:
//   {SUPABASE_URL}/storage/v1/object/public/qj-media/<folder>/<owner>/<file>
function storagePathFromPublicUrl(url) {
  const marker = `/object/public/${SUPABASE_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + marker.length));
}

/**
 * Persists one uploaded file (from multer memoryStorage — see
 * userUploadMiddleware.js) and returns the value to store on the
 * document: a Supabase public URL when configured, or the existing
 * "/uploads/<folder>/<file>" relative path otherwise. Same public
 * signature/behavior as the previous Cloudinary-backed version — callers
 * don't need to know which storage backend is actually in use.
 *
 * @param {Express.Multer.File} file
 * @param {string} folder - e.g. "profile_pics", "company_logos", "cover_photos", "resumes"
 * @param {string} [ownerId] - the uploading user's/company's id. Namespaces
 *   the storage path (folder/ownerId/uuid.ext) so uploads from two
 *   different accounts can never land in the same place — belt-and-braces
 *   on top of the uuid filename already making a collision astronomically
 *   unlikely, and it keeps each account's files browsable together in the
 *   Supabase dashboard.
 * @returns {Promise<string>}
 */
async function persistUpload(file, folder, ownerId) {
  if (IS_CONFIGURED) {
    const ext = safeExtensionFor(file.mimetype);
    if (!ext) throw new Error("Invalid file type.");
    const supabaseFolder = FOLDER_MAP[folder] || folder;
    const storagePath = `${supabaseFolder}/${ownerId || "misc"}/${uuidv4()}${ext}`;
    return uploadFile(file.buffer, storagePath, file.mimetype);
  }
  return writeBufferToLocalDisk(file.buffer, file.mimetype, folder);
}

/** persistUpload(), restricted to the image types this app already accepts for photos/logos. */
async function uploadImage(file, folder, ownerId) {
  if (!IMAGE_MIME_TYPES.includes(file.mimetype)) {
    throw new Error("Invalid image type. Only JPEG, JPG, PNG, WEBP, or GIF are allowed.");
  }
  return persistUpload(file, folder, ownerId);
}

/** persistUpload(), restricted to the document types this app already accepts for resumes. */
async function uploadDocument(file, folder, ownerId) {
  if (!DOCUMENT_MIME_TYPES.includes(file.mimetype)) {
    throw new Error("Invalid document type. Only PDF is allowed.");
  }
  return persistUpload(file, folder, ownerId);
}

/**
 * Deletes a previously-stored file, whichever kind it is — a Supabase
 * public URL (recovers the storage path and removes it from the bucket),
 * a legacy local path (unlinks it from disk), or a legacy Cloudinary URL
 * (left alone: this app no longer holds Cloudinary credentials, so there
 * is nothing it can do about that file — it's an orphaned record in a
 * provider this app doesn't use for new uploads anymore, not a
 * correctness problem for QJ itself). Never throws — deleting the OLD
 * file during a replace is a courtesy cleanup, not something that should
 * block the new upload from saving if it fails.
 *
 * @param {string} stored - the value previously returned by persistUpload
 */
async function deleteStoredFile(stored) {
  if (!stored) return;
  try {
    if (isSupabaseUrl(stored)) {
      const storagePath = storagePathFromPublicUrl(stored);
      if (storagePath) await deleteFile(storagePath);
    } else if (isCloudinaryUrl(stored)) {
      // See doc comment above — intentionally a no-op.
    } else {
      const filePath = path.join(__dirname, "..", stored);
      await fs.promises.unlink(filePath);
    }
  } catch (err) {
    console.error(`Failed to delete stored file (${stored}):`, err.message);
  }
}

module.exports = {
  IS_CONFIGURED,
  isSupabaseUrl,
  isCloudinaryUrl,
  persistUpload,
  deleteStoredFile,
  uploadFile,
  deleteFile,
  getPublicUrl,
  uploadImage,
  uploadDocument,
};
