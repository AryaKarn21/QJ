/**
 * services/media.service.js
 *
 * Persistent file storage for uploads (profile pics, company logos, cover
 * photos, resumes) via Cloudinary — replacing local disk writes, which
 * Render's ephemeral filesystem wipes on every restart/redeploy. Every
 * uploaded photo/resume was silently disappearing the moment the dyno
 * recycled; the DB kept the path string, but the file itself was gone.
 *
 * Guarded the same way Gemini AI degrades gracefully without
 * GEMINI_API_KEY (see utils/geminiClient.js): if CLOUDINARY_CLOUD_NAME/
 * API_KEY/API_SECRET aren't set, this falls back to writing the buffer to
 * local disk exactly as userUploadMiddleware.js always has — a deploy
 * that hasn't configured Cloudinary yet still works, it just keeps
 * today's non-persistent behavior until it is.
 */

const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const cloudinary = require("cloudinary").v2;
const { safeExtensionFor } = require("../middleware/safeUploadExtension");

const IS_CONFIGURED = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET
);

if (IS_CONFIGURED) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
} else {
  console.warn(
    "Cloudinary is not configured (CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET missing) — " +
    "uploaded files will be written to local disk, which Render (and most PaaS free tiers) " +
    "wipes on every restart/redeploy. Set those three env vars to persist uploads."
  );
}

/** True for a Cloudinary-hosted URL, false for a local "/uploads/..." path — lets callers tell old and new storage apart without guessing. */
function isCloudinaryUrl(stored) {
  return typeof stored === "string" && stored.startsWith("https://res.cloudinary.com/");
}

function uploadBufferToCloudinary(buffer, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: `quickjobs/${folder}`, resource_type: "auto" },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
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
  // deployment without Cloudinary configured behaves exactly as before.
  return `/uploads/${folder}/${filename}`;
}

/**
 * Persists one uploaded file (from multer memoryStorage — see
 * userUploadMiddleware.js) and returns the value to store on the
 * document: a Cloudinary secure_url when configured, or the existing
 * "/uploads/<folder>/<file>" relative path otherwise.
 *
 * @param {Express.Multer.File} file
 * @param {string} folder - e.g. "profile_pics", "company_logos", "cover_photos", "resumes"
 * @returns {Promise<string>}
 */
async function persistUpload(file, folder) {
  if (IS_CONFIGURED) {
    const result = await uploadBufferToCloudinary(file.buffer, folder);
    return result.secure_url;
  }
  return writeBufferToLocalDisk(file.buffer, file.mimetype, folder);
}

/**
 * Deletes a previously-stored file, whichever kind it is — a Cloudinary
 * URL (extracts the public_id and destroys it) or a legacy local path
 * (unlinks it from disk). Never throws — deleting the OLD file during a
 * replace is a courtesy cleanup, not something that should block the new
 * upload from saving if it fails.
 *
 * @param {string} stored - the value previously returned by persistUpload
 */
async function deleteStoredFile(stored) {
  if (!stored) return;
  try {
    if (isCloudinaryUrl(stored)) {
      // e.g. https://res.cloudinary.com/<cloud>/image/upload/v168.../quickjobs/profile_pics/abc123.png
      // -> public_id "quickjobs/profile_pics/abc123"
      const afterUpload = stored.split("/upload/")[1];
      if (!afterUpload) return;
      const withoutVersion = afterUpload.replace(/^v\d+\//, "");
      const publicId = withoutVersion.replace(/\.[^./]+$/, "");
      await cloudinary.uploader.destroy(publicId, { resource_type: "auto" });
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
  isCloudinaryUrl,
  persistUpload,
  deleteStoredFile,
};
