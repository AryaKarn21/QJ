// Unit tests for services/media.service.js — the shared persistUpload()/
// deleteStoredFile() used by every upload in this app (resumes, profile
// pics, company logos, category icons, blog images).
//
// media.service.js computes IS_CONFIGURED/IS_PRODUCTION once at module
// load time from process.env, so every test that needs a different
// combination resets the module registry and re-requires it fresh with
// the env vars for that scenario already set.

const fs = require("fs");

const CLOUDINARY_ENV = {
  CLOUDINARY_CLOUD_NAME: "test-cloud",
  CLOUDINARY_API_KEY: "test-key",
  CLOUDINARY_API_SECRET: "test-secret",
};

// Fresh, resettable mock for the `cloudinary` package's default export
// shape media.service.js uses (`require("cloudinary").v2`).
const mockConfig = jest.fn();
const mockUploadStream = jest.fn();
const mockDestroy = jest.fn();
jest.mock("cloudinary", () => ({
  v2: {
    config: (...args) => mockConfig(...args),
    uploader: {
      upload_stream: (...args) => mockUploadStream(...args),
      destroy: (...args) => mockDestroy(...args),
    },
  },
}));

const ENV_KEYS = [...Object.keys(CLOUDINARY_ENV), "NODE_ENV"];

function loadMediaService(envOverrides) {
  jest.resetModules();
  const saved = {};
  ENV_KEYS.forEach((key) => {
    saved[key] = process.env[key];
    delete process.env[key];
  });
  Object.assign(process.env, envOverrides);

  const mod = require("../services/media.service");

  ENV_KEYS.forEach((key) => {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  });

  return mod;
}

// upload_stream's callback-based API — resolve/reject via the (error,
// result) callback exactly like the real SDK, driven by a controllable
// mock so each test can simulate success or a Cloudinary-side failure.
function mockUploadStreamSuccess(secureUrl) {
  mockUploadStream.mockImplementation((_opts, callback) => {
    callback(null, { secure_url: secureUrl });
    return { end: jest.fn() };
  });
}

function mockUploadStreamFailure(error) {
  mockUploadStream.mockImplementation((_opts, callback) => {
    callback(error, null);
    return { end: jest.fn() };
  });
}

const pdfFile = { buffer: Buffer.from("%PDF-1.4 fake resume"), mimetype: "application/pdf" };

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(fs, "mkdirSync").mockImplementation(() => undefined);
  jest.spyOn(fs, "writeFileSync").mockImplementation(() => undefined);
  jest.spyOn(fs.promises, "unlink").mockResolvedValue(undefined);
  jest.spyOn(console, "warn").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("media.service — Cloudinary configuration detection", () => {
  test("IS_CONFIGURED is true when all three Cloudinary vars are set", () => {
    const { IS_CONFIGURED } = loadMediaService({ ...CLOUDINARY_ENV });
    expect(IS_CONFIGURED).toBe(true);
  });

  test("IS_CONFIGURED is false when any single var is missing", () => {
    const { IS_CONFIGURED } = loadMediaService({
      CLOUDINARY_CLOUD_NAME: "test-cloud",
      CLOUDINARY_API_KEY: "test-key",
      // CLOUDINARY_API_SECRET intentionally omitted
    });
    expect(IS_CONFIGURED).toBe(false);
  });

  test("cloudinary.config() is called with the env credentials when configured", () => {
    loadMediaService({ ...CLOUDINARY_ENV });
    expect(mockConfig).toHaveBeenCalledWith({
      cloud_name: "test-cloud",
      api_key: "test-key",
      api_secret: "test-secret",
      secure: true,
    });
  });
});

describe("media.service — production requires Cloudinary", () => {
  test("persistUpload() throws CLOUD_STORAGE_NOT_CONFIGURED in production without Cloudinary vars", async () => {
    const { persistUpload } = loadMediaService({ NODE_ENV: "production" });

    await expect(persistUpload(pdfFile, "resumes", "user123")).rejects.toMatchObject({
      code: "CLOUD_STORAGE_NOT_CONFIGURED",
    });
  });

  test("production without Cloudinary never falls back to local disk", async () => {
    const { persistUpload } = loadMediaService({ NODE_ENV: "production" });

    await expect(persistUpload(pdfFile, "resumes", "user123")).rejects.toThrow();
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  test("production WITH Cloudinary configured uploads normally (no throw)", async () => {
    mockUploadStreamSuccess("https://res.cloudinary.com/test-cloud/raw/upload/v1/qj/resumes/user123/abc.pdf");
    const { persistUpload } = loadMediaService({ NODE_ENV: "production", ...CLOUDINARY_ENV });

    const url = await persistUpload(pdfFile, "resumes", "user123");
    expect(url).toBe("https://res.cloudinary.com/test-cloud/raw/upload/v1/qj/resumes/user123/abc.pdf");
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });
});

describe("media.service — local development fallback", () => {
  test("persistUpload() writes to local disk when Cloudinary is unset outside production", async () => {
    const { persistUpload } = loadMediaService({ NODE_ENV: "development" });

    const result = await persistUpload(pdfFile, "resumes", "user123");

    expect(fs.mkdirSync).toHaveBeenCalled();
    expect(fs.writeFileSync).toHaveBeenCalled();
    expect(result).toMatch(/^\/uploads\/resumes\/[a-f0-9-]+\.pdf$/);
  });

  test("local fallback also applies when NODE_ENV is unset entirely", async () => {
    const { persistUpload } = loadMediaService({});

    const result = await persistUpload(pdfFile, "resumes", "user123");

    expect(result).toMatch(/^\/uploads\/resumes\//);
  });
});

describe("media.service — successful resume upload via Cloudinary", () => {
  test("uploads a PDF as resource_type 'raw' with the resumes folder mapping", async () => {
    mockUploadStreamSuccess("https://res.cloudinary.com/test-cloud/raw/upload/v1/qj/resumes/user123/xyz.pdf");
    const { persistUpload } = loadMediaService({ ...CLOUDINARY_ENV });

    await persistUpload(pdfFile, "resumes", "user123");

    const [uploadOptions] = mockUploadStream.mock.calls[0];
    expect(uploadOptions.resource_type).toBe("raw");
    expect(uploadOptions.public_id).toMatch(/^qj\/resumes\/user123\//);
  });

  test("the persisted URL round-trips as a recognizable Cloudinary URL", async () => {
    const secureUrl = "https://res.cloudinary.com/test-cloud/raw/upload/v1/qj/resumes/user123/xyz.pdf";
    mockUploadStreamSuccess(secureUrl);
    const { persistUpload, isCloudinaryUrl } = loadMediaService({ ...CLOUDINARY_ENV });

    const savedResumeValue = await persistUpload(pdfFile, "resumes", "user123");

    // This is exactly the value the controller saves onto
    // Application.resume — confirming it's recognized as a Cloudinary URL
    // is what the rest of the app (deleteStoredFile, resolveMediaUrl on
    // the frontend) relies on to treat it as an already-absolute URL
    // rather than a root-relative /uploads/ path needing a prefix.
    expect(savedResumeValue).toBe(secureUrl);
    expect(isCloudinaryUrl(savedResumeValue)).toBe(true);
  });

  test("a Cloudinary-side upload failure rejects with the real error, not a swallowed one", async () => {
    mockUploadStreamFailure(new Error("Cloudinary quota exceeded"));
    const { persistUpload } = loadMediaService({ ...CLOUDINARY_ENV });

    await expect(persistUpload(pdfFile, "resumes", "user123")).rejects.toThrow("Cloudinary quota exceeded");
  });
});

describe("media.service — deleteStoredFile (retrieval-adjacent cleanup path)", () => {
  test("does nothing for a missing/nonexistent resume value", async () => {
    const { deleteStoredFile } = loadMediaService({ ...CLOUDINARY_ENV });

    await deleteStoredFile(undefined);
    await deleteStoredFile(null);
    await deleteStoredFile("");

    expect(mockDestroy).not.toHaveBeenCalled();
    expect(fs.promises.unlink).not.toHaveBeenCalled();
  });

  test("deletes a Cloudinary-hosted resume via the API when configured", async () => {
    const { deleteStoredFile } = loadMediaService({ ...CLOUDINARY_ENV });
    mockDestroy.mockResolvedValue({ result: "ok" });

    await deleteStoredFile("https://res.cloudinary.com/test-cloud/raw/upload/v1/qj/resumes/user123/xyz.pdf");

    expect(mockDestroy).toHaveBeenCalledWith("qj/resumes/user123/xyz", { resource_type: "raw" });
  });

  test("removes a local-disk resume file without throwing when the file is already gone", async () => {
    const { deleteStoredFile } = loadMediaService({ NODE_ENV: "development" });
    fs.promises.unlink.mockRejectedValueOnce(new Error("ENOENT: no such file"));

    await expect(deleteStoredFile("/uploads/resumes/already-deleted.pdf")).resolves.toBeUndefined();
  });

  test("skips legacy Supabase-hosted values without attempting a network call", async () => {
    const { deleteStoredFile } = loadMediaService({ ...CLOUDINARY_ENV });

    await deleteStoredFile("https://xxxxx.supabase.co/storage/v1/object/public/qj-media/resumes/old.pdf");

    expect(mockDestroy).not.toHaveBeenCalled();
    expect(fs.promises.unlink).not.toHaveBeenCalled();
  });
});

describe("media.service — formatCloudinaryInlineUrl and formatCloudinaryDownloadUrl", () => {
  test("strips transformation flags from raw upload URLs to prevent Cloudinary 400 Bad Request", () => {
    const { formatCloudinaryInlineUrl, formatCloudinaryDownloadUrl } = loadMediaService({ ...CLOUDINARY_ENV });
    const rawUrl = "https://res.cloudinary.com/test-cloud/raw/upload/v12345/resumes/user1/test.pdf";
    const withInline = "https://res.cloudinary.com/test-cloud/raw/upload/fl_inline/v12345/resumes/user1/test.pdf";
    const withAttachment = "https://res.cloudinary.com/test-cloud/raw/upload/fl_attachment:test/v12345/resumes/user1/test.pdf";

    expect(formatCloudinaryInlineUrl(rawUrl)).toBe(rawUrl);
    expect(formatCloudinaryInlineUrl(withInline)).toBe(rawUrl);
    expect(formatCloudinaryInlineUrl(withAttachment)).toBe(rawUrl);

    expect(formatCloudinaryDownloadUrl(rawUrl, "resume.pdf")).toBe(rawUrl);
    expect(formatCloudinaryDownloadUrl(withInline, "resume.pdf")).toBe(rawUrl);
    expect(formatCloudinaryDownloadUrl(withAttachment, "resume.pdf")).toBe(rawUrl);
  });

  test("adds fl_attachment flag to image uploads", () => {
    const { formatCloudinaryDownloadUrl } = loadMediaService({ ...CLOUDINARY_ENV });
    const imageUrl = "https://res.cloudinary.com/test-cloud/image/upload/v12345/test.png";

    const downloadUrl = formatCloudinaryDownloadUrl(imageUrl, "profile.png");
    expect(downloadUrl).toBe("https://res.cloudinary.com/test-cloud/image/upload/fl_attachment:profile.png/v12345/test.png");
  });
});
