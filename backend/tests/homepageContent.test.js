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
  it("upserts the singleton document by its fixed id, coercing isPublished to a boolean", async () => {
    HomepageContent.findByIdAndUpdate.mockResolvedValue({ isPublished: true });
    const req = {
      body: { isPublished: "yes", hero: { headline: "New headline" }, cta: {} },
      user: { id: "admin-1" },
    };
    const res = mockRes();

    await upsertHomepageContent(req, res);

    expect(HomepageContent.findByIdAndUpdate).toHaveBeenCalledWith(
      "homepage",
      expect.objectContaining({ isPublished: true, hero: { headline: "New headline" } }),
      expect.objectContaining({ upsert: true })
    );
  });
});
