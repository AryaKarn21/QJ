const mongoose = require("mongoose");

// Mock dependencies for postController & jobController
jest.mock("../models/Post");
jest.mock("../models/Comment");
jest.mock("../models/Like");
jest.mock("../models/Bookmark");
jest.mock("../models/Follow");
jest.mock("../models/Hashtag");
jest.mock("../models/User");
jest.mock("../models/Job");
jest.mock("../models/Application");
jest.mock("../models/AuditLog");
jest.mock("../models/Message");
jest.mock("../models/ShareEvent");
jest.mock("../models/Connection");
jest.mock("../utils/sendNotifications", () => jest.fn());
jest.mock("../utils/aiModeration", () => ({
  moderateText: jest.fn().mockResolvedValue({ status: "approved", flags: [] }),
  detectHiringIntentHeuristic: jest.fn(),
}));
jest.mock("../utils/textParsing", () => ({
  extractHashtags: jest.fn((content) => {
    if (!content) return [];
    const matches = content.match(/#[a-zA-Z0-9_]+/g);
    return matches ? matches.map((t) => t.slice(1).toLowerCase()) : [];
  }),
  extractMentionIds: jest.fn((content) => {
    if (!content) return [];
    const matches = [...content.matchAll(/@(?:company)?\[[^\]]+\]\(([a-f0-9]{24})\)/gi)];
    return matches.map((m) => m[1]);
  }),
}));
jest.mock("../utils/postHydration", () => ({
  hydratePosts: jest.fn(async (posts) => posts),
}));
jest.mock("../utils/conversationHelpers", () => ({ findOrCreateConversation: jest.fn() }));
jest.mock("../utils/socket", () => ({ emitToConversation: jest.fn() }));
jest.mock("../utils/auditLogger", () => ({
  recordAdminAudit: jest.fn().mockResolvedValue({}),
}));

const Post = require("../models/Post");
const User = require("../models/User");
const Hashtag = require("../models/Hashtag");
const Job = require("../models/Job");
const Application = require("../models/Application");
const { recordAdminAudit } = require("../utils/auditLogger");

const {
  normalizeHashtags,
  createPost,
  updatePost,
  deletePost,
} = require("../controllers/postController");

const {
  updateJob,
  deleteJob,
  updateJobStatus,
} = require("../controllers/jobController");

const validId = () => new mongoose.Types.ObjectId().toString();

function mockRes() {
  const res = { statusCode: 200 };
  res.status = jest.fn((code) => {
    res.statusCode = code;
    return res;
  });
  res.json = jest.fn((data) => {
    res.body = data;
    return res;
  });
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
  if (Application) {
    Application.deleteMany = jest.fn().mockResolvedValue({ deletedCount: 0 });
  }
});

describe("Hashtag Normalization Unit Tests", () => {
  it("normalizes, deduplicates, trims leading #, and lowercases hashtags", () => {
    const raw = ["#ReactJS", "reactjs", "#HIRING", "  #NepalJobs  ", "invalid!tag", "", null];
    const normalized = normalizeHashtags(raw);
    expect(normalized).toEqual(["reactjs", "hiring", "nepaljobs"]);
  });

  it("handles non-array inputs safely", () => {
    expect(normalizeHashtags(null)).toEqual([]);
    expect(normalizeHashtags(undefined)).toEqual([]);
    expect(normalizeHashtags("not an array")).toEqual([]);
  });
});

describe("Community Post — Creation & DB Mention Validation", () => {
  it("only persists verified active user IDs in mentions and merges explicit + inline hashtags", async () => {
    const authorId = validId();
    const verifiedUserId = validId();
    const fakeUserId = validId();

    User.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([{ _id: verifiedUserId }]),
      }),
    });

    const mockSavedPost = {
      _id: validId(),
      author: authorId,
      content: "Looking for devs @[Rohit](" + verifiedUserId + ") and fake @[Hacker](" + fakeUserId + ") #Tech",
      hashtags: ["tech", "hiring"],
      mentions: [verifiedUserId],
      toObject: () => ({ _id: "post123", content: "test" }),
    };

    Post.create.mockResolvedValue(mockSavedPost);
    Hashtag.findOneAndUpdate = jest.fn().mockResolvedValue({});

    const req = {
      user: { _id: authorId, role: "jobseeker", name: "Author" },
      body: {
        content: "Looking for devs @[Rohit](" + verifiedUserId + ") and fake @[Hacker](" + fakeUserId + ") #Tech",
        hashtags: ["#Hiring", "#tech"],
      },
      files: [],
    };
    const res = mockRes();

    await createPost(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(Post.create).toHaveBeenCalledWith(
      expect.objectContaining({
        hashtags: expect.arrayContaining(["tech", "hiring"]),
        mentions: [verifiedUserId],
      })
    );
  });
});

describe("Community Post — Edit & Delete Authorization (Owner & Super Admin)", () => {
  const authorId = validId();
  const otherUserId = validId();
  const superAdminId = validId();
  const postId = validId();

  it("blocks User B from editing User A's post (403 Forbidden)", async () => {
    Post.findById.mockResolvedValue({
      _id: postId,
      author: authorId,
      isDeleted: false,
    });

    const req = {
      params: { postId },
      user: { _id: otherUserId, role: "jobseeker" },
      body: { content: "Tampered content" },
    };
    const res = mockRes();

    await updatePost(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/only edit your own posts/i) })
    );
  });

  it("allows the post owner (User A) to edit their post", async () => {
    const mockPost = {
      _id: postId,
      author: authorId,
      content: "Original #OldTag",
      hashtags: ["oldtag"],
      mentions: [],
      media: [],
      topics: [],
      isDeleted: false,
      save: jest.fn().mockResolvedValue(true),
      toObject: () => ({ _id: postId, content: "Updated #NewTag" }),
    };
    Post.findById.mockResolvedValue(mockPost);
    Hashtag.findOneAndUpdate = jest.fn().mockResolvedValue({});

    const req = {
      params: { postId },
      user: { _id: authorId, role: "jobseeker" },
      body: {
        content: "Updated #NewTag",
        hashtags: ["#NewTag"],
      },
    };
    const res = mockRes();

    await updatePost(req, res);

    expect(res.statusCode).toBe(200);
    expect(mockPost.content).toBe("Updated #NewTag");
    expect(mockPost.hashtags).toEqual(["newtag"]);
    expect(mockPost.save).toHaveBeenCalled();
    expect(recordAdminAudit).not.toHaveBeenCalled();
  });

  it("allows Super Admin to edit ANY post and records an audit log", async () => {
    const mockPost = {
      _id: postId,
      author: authorId,
      content: "Original Content",
      hashtags: ["tech"],
      mentions: [],
      media: [],
      topics: [],
      isDeleted: false,
      save: jest.fn().mockResolvedValue(true),
      toObject: () => ({ _id: postId, content: "Moderated by Super Admin #Moderated" }),
    };
    Post.findById.mockResolvedValue(mockPost);
    Hashtag.findOneAndUpdate = jest.fn().mockResolvedValue({});

    const req = {
      params: { postId },
      user: { _id: superAdminId, role: "superadmin", email: "superadmin@quickjobs.com" },
      body: {
        content: "Moderated by Super Admin #Moderated",
        hashtags: ["moderated"],
      },
    };
    const res = mockRes();

    await updatePost(req, res);

    expect(res.statusCode).toBe(200);
    expect(mockPost.content).toBe("Moderated by Super Admin #Moderated");
    expect(mockPost.save).toHaveBeenCalled();
    expect(recordAdminAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        user: expect.objectContaining({ role: "superadmin" }),
        action: expect.stringMatching(/Super Admin edited Community Post/i),
        contentId: postId,
      })
    );
  });

  it("blocks User B from deleting User A's post (403 Forbidden)", async () => {
    Post.findById.mockResolvedValue({
      _id: postId,
      author: authorId,
      isDeleted: false,
    });

    const req = {
      params: { postId },
      user: { _id: otherUserId, role: "jobseeker" },
    };
    const res = mockRes();

    await deletePost(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/only delete your own posts/i) })
    );
  });

  it("allows Super Admin to delete ANY post, decrements hashtags, and records audit", async () => {
    const mockPost = {
      _id: postId,
      author: authorId,
      hashtags: ["react", "node"],
      isDeleted: false,
      save: jest.fn().mockResolvedValue(true),
    };
    Post.findById.mockResolvedValue(mockPost);
    Hashtag.findOneAndUpdate = jest.fn().mockResolvedValue({});

    const req = {
      params: { postId },
      user: { _id: superAdminId, role: "superadmin", email: "superadmin@quickjobs.com" },
    };
    const res = mockRes();

    await deletePost(req, res);

    expect(res.statusCode).toBe(200);
    expect(mockPost.isDeleted).toBe(true);
    expect(mockPost.save).toHaveBeenCalled();
    expect(Hashtag.findOneAndUpdate).toHaveBeenCalled();
    expect(recordAdminAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        user: expect.objectContaining({ role: "superadmin" }),
        action: expect.stringMatching(/Super Admin deleted Community Post/i),
        contentId: postId,
      })
    );
  });
});

describe("Job Listing — Super Admin & Owner Permissions (update, delete, status)", () => {
  const employerId = validId();
  const otherEmployerId = validId();
  const superAdminId = validId();
  const jobId = validId();

  it("blocks unauthorized user from updating a job (403 Forbidden)", async () => {
    Job.findById.mockResolvedValue({
      _id: jobId,
      employer: employerId,
      title: "Backend Engineer",
    });

    const req = {
      params: { id: jobId },
      user: { _id: otherEmployerId, role: "employer" },
      body: { title: "Hacked Job Title" },
    };
    const res = mockRes();

    await updateJob(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/not authorized/i) })
    );
  });

  it("allows Job Owner to update their own job", async () => {
    const mockJob = {
      _id: jobId,
      employer: employerId,
      title: "Senior React Developer",
      save: jest.fn().mockResolvedValue(true),
    };
    Job.findById.mockResolvedValue(mockJob);

    const req = {
      params: { id: jobId },
      user: { _id: employerId, role: "employer" },
      body: {
        title: "Lead React Developer",
        salary: { min: 80000, max: 120000, period: "yearly", currency: "USD" },
      },
    };
    const res = mockRes();

    await updateJob(req, res);

    expect(res.statusCode).toBe(200);
    expect(mockJob.title).toBe("Lead React Developer");
    expect(mockJob.save).toHaveBeenCalled();
    expect(recordAdminAudit).not.toHaveBeenCalled();
  });

  it("allows Super Admin to update ANY job and records an audit log", async () => {
    const mockJob = {
      _id: jobId,
      employer: employerId,
      title: "Senior React Developer",
      save: jest.fn().mockResolvedValue(true),
    };
    Job.findById.mockResolvedValue(mockJob);

    const req = {
      params: { id: jobId },
      user: { _id: superAdminId, role: "superadmin", email: "admin@quickjobs.com" },
      body: {
        title: "Staff React Engineer",
        status: "Active",
      },
    };
    const res = mockRes();

    await updateJob(req, res);

    expect(res.statusCode).toBe(200);
    expect(mockJob.title).toBe("Staff React Engineer");
    expect(mockJob.save).toHaveBeenCalled();
    expect(recordAdminAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        user: expect.objectContaining({ role: "superadmin" }),
        action: expect.stringMatching(/Super Admin edited Job Listing/i),
        contentType: "Job",
        contentId: jobId,
      })
    );
  });

  it("allows Super Admin or Owner to activate/deactivate job status via PATCH /:id/status", async () => {
    const mockJob = {
      _id: jobId,
      employer: employerId,
      status: "Active",
      isActive: true,
      save: jest.fn().mockResolvedValue(true),
    };
    Job.findById.mockResolvedValue(mockJob);

    const req = {
      params: { id: jobId },
      user: { _id: superAdminId, role: "superadmin" },
      body: { status: "Inactive" },
    };
    const res = mockRes();

    await updateJobStatus(req, res);

    expect(res.statusCode).toBe(200);
    expect(mockJob.status).toBe("Inactive");
    expect(mockJob.save).toHaveBeenCalled();
  });

  it("allows Super Admin to delete ANY job and logs audit", async () => {
    const mockJob = {
      _id: jobId,
      employer: employerId,
      title: "DevOps Engineer",
    };
    Job.findById.mockResolvedValue(mockJob);
    Job.findByIdAndDelete = jest.fn().mockResolvedValue({});

    const req = {
      params: { id: jobId },
      user: { _id: superAdminId, role: "superadmin" },
    };
    const res = mockRes();

    await deleteJob(req, res);

    expect(res.statusCode).toBe(200);
    expect(Job.findByIdAndDelete).toHaveBeenCalledWith(jobId);
    expect(recordAdminAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        user: expect.objectContaining({ role: "superadmin" }),
        action: expect.stringMatching(/Super Admin deleted Job Listing/i),
        contentType: "Job",
        contentId: jobId,
      })
    );
  });
});
