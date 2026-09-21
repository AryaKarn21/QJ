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

// Render's filesystem is ephemeral — anything written to local disk is
// gone the moment the service restarts or redeploys (this is exactly what
// happened to resumes/icons/images uploaded while these vars were unset:
// they returned 200 at upload time, then 404'd after the next deploy).
// Local disk is a legitimate fallback for development, where nobody
// expects an upload to outlive `nodemon` restarting — it is never a safe
// fallback in production, so that combination fails loudly at upload time
// instead of silently accepting a file it can't actually keep.
const IS_PRODUCTION = process.env.NODE_ENV === "production";

if (IS_CONFIGURED) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
} else if (IS_PRODUCTION) {
  console.error(
    "[media.service] FATAL: Cloudinary is not configured in production. " +
    "Uploads (resumes, profile pics, company logos, icons, images) would " +
    "silently fall back to this service's local disk, which Render wipes " +
    "on every restart/redeploy — files would 404 shortly after being " +
    "uploaded. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and " +
    "CLOUDINARY_API_SECRET in the Render dashboard. Every persistUpload() " +
    "call will fail until this is fixed, by design — see persistUpload()."
  );
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
  cms_images:           "qj/cms-images",
  community_media:      "qj/community",
};

const ANY_TYPE_FOLDERS = new Set(["message_attachments", "community_media"]);

function isCloudinaryUrl(stored) {
  return typeof stored === "string" && stored.startsWith("https://res.cloudinary.com/");
}

function isSupabaseUrl(stored) {
  return typeof stored === "string" && stored.includes(".supabase.co/storage/");
}

function formatCloudinaryInlineUrl(url) {
  if (!isCloudinaryUrl(url)) return url;
  // Raw files cannot be transformed in Cloudinary (returns 400 Bad Request)
  if (url.includes("/raw/upload/")) {
    return url.replace(/\/raw\/upload\/(fl_inline\/|fl_attachment[^/]*\/)?/, "/raw/upload/");
  }
  return url;
}

function formatCloudinaryDownloadUrl(url, filename) {
  if (!isCloudinaryUrl(url)) return url;
  if (url.includes("/raw/upload/")) {
    return url.replace(/\/raw\/upload\/(fl_inline\/|fl_attachment[^/]*\/)?/, "/raw/upload/");
  }
  if (url.includes("/image/upload/")) {
    const safeFilename = filename ? encodeURIComponent(filename.replace(/[/\\?%*:|"<>]/g, "_")) : "";
    const flag = safeFilename ? `fl_attachment:${safeFilename}` : "fl_attachment";
    return url.replace(/\/image\/upload\/(fl_inline\/)?/, `/image/upload/${flag}/`);
  }
  return url;
}

function getCloudinaryPrivateDownloadUrl(url, filename) {
  if (!isCloudinaryUrl(url)) return url;
  try {
    const clean = url.split("?")[0];
    const isRaw = clean.includes("/raw/upload/");
    const marker = isRaw ? "/raw/upload/" : "/image/upload/";
    const idx = clean.indexOf(marker);
    if (idx === -1) return url;
    let publicId = clean.slice(idx + marker.length).replace(/^v\d+\//, "");
    const ext = path.extname(publicId).replace(/^\./, "") || "pdf";

    return cloudinary.utils.private_download_url(publicId, ext, {
      resource_type: isRaw ? "raw" : "image",
      type: "upload",
      attachment: Boolean(filename),
      expires_at: Math.floor(Date.now() / 1000) + 7200,
    });
  } catch (err) {
    console.error("Error generating private download URL:", err);
    return url;
  }
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
  const isVideo   = mimetype.startsWith("video/");
  const isPdf     = mimetype === "application/pdf";
  if (!isImage && !isVideo && !isPdf && !ANY_TYPE_FOLDERS.has(folder)) throw new Error("Invalid file type.");

  let resourceType = "image";
  if (isVideo) {
    resourceType = "video";
  } else if (!isImage) {
    resourceType = "raw";
  }

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
  if (IS_PRODUCTION) {
    // Refuse rather than accept a file onto ephemeral disk and hand back a
    // URL that looks successful today and 404s after the next deploy —
    // see the FATAL log at module load for the operator-facing version of
    // this. `.code` lets callers (e.g. applyInJob) give a specific 503
    // instead of a generic 500.
    const err = new Error(
      "File storage is not configured for production. Please contact support."
    );
    err.code = "CLOUD_STORAGE_NOT_CONFIGURED";
    throw err;
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
  IS_PRODUCTION,
  persistUpload,
  deleteStoredFile,
  isCloudinaryUrl,
  isSupabaseUrl,
  formatCloudinaryInlineUrl,
  formatCloudinaryDownloadUrl,
  getCloudinaryPrivateDownloadUrl,
};