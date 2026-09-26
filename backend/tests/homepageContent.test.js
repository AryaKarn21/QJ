// Unit tests for the Homepage CMS endpoints (backend/controllers/cmsController.js
// getHomepageContent/upsertHomepageContent, backed by models/HomepageContent.js).
// Mocks the model, same approach as the other controller test suites.
jest.mock("../models/HomepageContent");

const HomepageContent = require("../models/HomepageContent");
HomepageContent.SINGLETON_ID = "homepage";

const { getHomepageContent, upsertHomepageContent } = require("../controllers/cmsController");

function mockRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("getHomepageContent", () => {
  it("returns isPublished:false when nothing has been saved yet", async () => {
    HomepageContent.findById.mockReturnValue({ lean: () => Promise.resolve(null) });
    const res = mockRes();

    await getHomepageContent({}, res);

    expect(res.json).toHaveBeenCalledWith({ isPublished: false });
  });

  it("returns isPublished:false (not the draft content) when a document exists but isn't published", async () => {
    HomepageContent.findById.mockReturnValue({
      lean: () => Promise.resolve({ isPublished: false, hero: { headline: "Draft in progress" } }),
    });
    const res = mockRes();

    await getHomepageContent({}, res);

    expect(res.json).toHaveBeenCalledWith({ isPublished: false });
  });

  it("returns the full document once published", async () => {
    const published = { isPublished: true, hero: { headline: "Find Your Next Role" } };
    HomepageContent.findById.mockReturnValue({ lean: () => Promise.resolve(published) });
    const res = mockRes();

    await getHomepageContent({}, res);

    expect(res.json).toHaveBeenCalledWith(published);
  });
});

describe("upsertHomepageContent", () => {
  it("creates the singleton document on first save, coercing isPublished to a boolean", async () => {
    HomepageContent.findById.mockResolvedValue(null);
    HomepageContent.create.mockResolvedValue({ isPublished: true });
    const req = {
      body: { isPublished: "yes", hero: { headline: "New headline" }, cta: {} },
      user: { id: "admin-1" },
    };
    const res = mockRes();

    await upsertHomepageContent(req, res);

    expect(HomepageContent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: "homepage",
        isPublished: true,
        hero: { headline: "New headline" },
      })
    );
  });

  it("snapshots a revision before overwriting an existing document when content actually changed", async () => {
    const existing = {
      isPublished: false,
      hero: { headline: "Old headline" },
      cta: {},
      sections: [],
      revisions: [],
      version: 1,
      save: jest.fn().mockResolvedValue(true),
    };
    HomepageContent.findById.mockResolvedValue(existing);

    const req = {
      body: { isPublished: true, hero: { headline: "New headline" }, cta: {} },
      user: { id: "admin-1" },
    };
    const res = mockRes();

    await upsertHomepageContent(req, res);

    expect(existing.revisions).toHaveLength(1);
    expect(existing.revisions[0]).toEqual(
      expect.objectContaining({ revNumber: 1, hero: { headline: "Old headline" } })
    );
    expect(existing.hero).toEqual({ headline: "New headline" });
    expect(existing.save).toHaveBeenCalled();
  });

  it("does not pad history when saving with no actual changes", async () => {
    const existing = {
      isPublished: true,
      hero: { headline: "Same" },
      cta: {},
      sections: [],
      revisions: [],
      version: 1,
      save: jest.fn().mockResolvedValue(true),
    };
    HomepageContent.findById.mockResolvedValue(existing);

    const req = {
      body: { isPublished: true, hero: { headline: "Same" }, cta: {} },
      user: { id: "admin-1" },
    };
    const res = mockRes();

    await upsertHomepageContent(req, res);

    expect(existing.revisions).toHaveLength(0);
  });
});
