// Manual mock factory instead of jest.mock("../models/Blog") automock —
// Blog.js's nested comment subdocuments make Jest's automock walk into
// Mongoose's internal document-compile helpers and throw, unrelated to
// anything this test actually needs (only the static Blog.findOne).
jest.mock("../models/Blog", () => ({
  findOne: jest.fn(),
  findByIdAndDelete: jest.fn(),
}));

const Blog = require("../models/Blog");
const { toggleLikeBlog } = require("../controllers/blogController");

function mockRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("toggleLikeBlog — slug vs ObjectId lookup", () => {
  it("looks the blog up by slug (not findById) when the :id param is a slug string", async () => {
    const blog = {
      _id: "507f1f77bcf86cd799439011",
      likes: [],
      save: jest.fn().mockResolvedValue(true),
    };
    Blog.findOne.mockResolvedValue(blog);

    const req = {
      params: { id: "how-to-get-a-software-job-in-2026" },
      user: { id: "507f1f77bcf86cd799439012" },
    };
    const res = mockRes();

    await toggleLikeBlog(req, res);

    expect(Blog.findOne).toHaveBeenCalledWith({ slug: "how-to-get-a-software-job-in-2026" });
    expect(res.status).not.toHaveBeenCalledWith(500);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(blog.likes).toContain("507f1f77bcf86cd799439012");
  });

  it("looks the blog up by _id when the :id param is a valid ObjectId", async () => {
    const blog = {
      _id: "507f1f77bcf86cd799439011",
      likes: [],
      save: jest.fn().mockResolvedValue(true),
    };
    Blog.findOne.mockResolvedValue(blog);

    const req = {
      params: { id: "507f1f77bcf86cd799439011" },
      user: { id: "507f1f77bcf86cd799439012" },
    };
    const res = mockRes();

    await toggleLikeBlog(req, res);

    expect(Blog.findOne).toHaveBeenCalledWith({ _id: "507f1f77bcf86cd799439011" });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("toggles unlike when the user has already liked the blog", async () => {
    const blog = {
      _id: "507f1f77bcf86cd799439011",
      likes: ["507f1f77bcf86cd799439012"],
      save: jest.fn().mockResolvedValue(true),
    };
    Blog.findOne.mockResolvedValue(blog);

    const req = {
      params: { id: "some-slug" },
      user: { id: "507f1f77bcf86cd799439012" },
    };
    const res = mockRes();

    await toggleLikeBlog(req, res);

    expect(blog.likes).not.toContain("507f1f77bcf86cd799439012");
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ isLiked: false, likesCount: 0 })
    );
  });

  it("returns 404 (not 500) when no blog matches the slug", async () => {
    Blog.findOne.mockResolvedValue(null);

    const req = { params: { id: "nonexistent-slug" }, user: { id: "507f1f77bcf86cd799439012" } };
    const res = mockRes();

    await toggleLikeBlog(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});
