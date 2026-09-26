// Unit tests for the CMS-expansion work: legacy legal-page revision
// snapshotting (Part C7) and the new sitewide key/value content model
// (Part C2). Same mocking approach as homepageContent.test.js.
jest.mock("../models/Page");
jest.mock("../models/SiteContent");
jest.mock("../utils/sanitizeHtml", () => ({
  sanitizeRichText: (html) => html,
}));

const Page = require("../models/Page");
const SiteContent = require("../models/SiteContent");
const {
  upsertPage,
  getSiteContentMap,
  adminUpsertSiteContent,
  adminDeleteSiteContent,
} = require("../controllers/cmsController");

function mockRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("upsertPage (legacy legal-page slugs) — now snapshots revisions", () => {
  it("snapshots the pre-edit state before overwriting an existing legal page", async () => {
    const existing = {
      slug: "privacy-policy",
      title: "Privacy Policy",
      content: "<p>Old content</p>",
      revisions: [],
      version: 1,
      save: jest.fn().mockResolvedValue(true),
    };
    Page.findOne.mockResolvedValue(existing);

    const req = {
      params: { slug: "privacy-policy" },
      body: { title: "Privacy Policy", content: "<p>New content</p>" },
      user: { id: "admin-1" },
    };
    const res = mockRes();

    await upsertPage(req, res);

    expect(existing.revisions).toHaveLength(1);
    expect(existing.revisions[0]).toEqual(expect.objectContaining({ content: "<p>Old content</p>" }));
    expect(existing.content).toBe("<p>New content</p>");
    expect(existing.save).toHaveBeenCalled();
  });

  it("creates the page on first save without needing a revision", async () => {
    Page.findOne.mockResolvedValue(null);
    Page.create.mockResolvedValue({ slug: "terms-of-service", title: "Terms", content: "<p>Hi</p>" });

    const req = {
      params: { slug: "terms-of-service" },
      body: { title: "Terms", content: "<p>Hi</p>" },
      user: { id: "admin-1" },
    };
    const res = mockRes();

    await upsertPage(req, res);

    expect(Page.create).toHaveBeenCalledWith(
      expect.objectContaining({ slug: "terms-of-service", title: "Terms", content: "<p>Hi</p>" })
    );
  });

  it("rejects an unknown slug with 400", async () => {
    const req = { params: { slug: "not-a-real-policy" }, body: {}, user: { id: "admin-1" } };
    const res = mockRes();

    await upsertPage(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(Page.findOne).not.toHaveBeenCalled();
  });
});

describe("Site Content — public map + admin CRUD", () => {
  it("returns a flat key->value map from every stored document", async () => {
    Page.findOne.mockResolvedValue(null); // unused here, just isolating mocks
    SiteContent.find.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([
        { key: "footer.about.description", value: "QuickJobs connects talent with opportunity." },
        { key: "resume.gallery.heading", value: "Build a Resume for Your Job" },
      ]),
    });

    const res = mockRes();
    await getSiteContentMap({}, res);

    expect(res.json).toHaveBeenCalledWith({
      "footer.about.description": "QuickJobs connects talent with opportunity.",
      "resume.gallery.heading": "Build a Resume for Your Job",
    });
  });

  it("upserts a single key", async () => {
    SiteContent.findOneAndUpdate.mockResolvedValue({ key: "resume.gallery.heading", value: "New Heading" });

    const req = {
      params: { key: "resume.gallery.heading" },
      body: { value: "New Heading", section: "Resume Builder" },
      user: { id: "admin-1" },
    };
    const res = mockRes();

    await adminUpsertSiteContent(req, res);

    expect(SiteContent.findOneAndUpdate).toHaveBeenCalledWith(
      { key: "resume.gallery.heading" },
      expect.objectContaining({ key: "resume.gallery.heading", value: "New Heading" }),
      expect.objectContaining({ upsert: true })
    );
  });

  it("returns 404 deleting a key that doesn't exist", async () => {
    SiteContent.findOneAndDelete.mockResolvedValue(null);

    const req = { params: { key: "nonexistent.key" } };
    const res = mockRes();

    await adminDeleteSiteContent(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});
