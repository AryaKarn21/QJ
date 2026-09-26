const mongoose = require("mongoose");
const Blog = require("../models/Blog");
const User = require("../models/User");
const Jobseeker = require("../models/Jobseeker");
const {
  getGeminiModel,
  classifyGeminiError,
} = require("../utils/geminiClient");
const Employer = require("../models/Employer");
const { persistUpload } = require("../services/media.service");

// ============================================================
// AI ERROR HANDLER
// ============================================================

function friendlyAiError(res, error, fallbackMessage) {
  // Always log the real error on the backend.
  // This is extremely useful for Render logs/debugging.
  console.error("======================================");
  console.error("AI GENERATION ERROR");
  console.error("Message:", error?.message);
  console.error("Code:", error?.code);
  console.error("Status:", error?.status);
  console.error("Response:", error?.response);
  console.error("Stack:", error?.stack);
  console.error("======================================");

  const classifiedCode = classifyGeminiError(error);

  // ----------------------------------------------------------
  // Gemini API key is missing
  // ----------------------------------------------------------
  if (classifiedCode === "GEMINI_NOT_CONFIGURED") {
    return res.status(503).json({
      success: false,
      message:
        "AI features aren't configured yet. Add GEMINI_API_KEY to the backend environment variables.",
      errorCode: "AI_NOT_CONFIGURED",
    });
  }

  // ----------------------------------------------------------
  // Invalid Gemini API key
  // ----------------------------------------------------------
  if (classifiedCode === "GEMINI_INVALID_KEY") {
    return res.status(503).json({
      success: false,
      message: "The Gemini API key is invalid or unauthorized.",
      errorCode: "AI_INVALID_KEY",
    });
  }

  // ----------------------------------------------------------
  // Gemini quota/rate limit exceeded
  // ----------------------------------------------------------
  if (classifiedCode === "GEMINI_QUOTA_EXCEEDED") {
    return res.status(429).json({
      success: false,
      message:
        "Gemini API quota has been exceeded. Please try again later.",
      errorCode: "AI_QUOTA_EXCEEDED",
    });
  }

  // ----------------------------------------------------------
  // Gemini temporarily unavailable
  // ----------------------------------------------------------
  if (classifiedCode === "GEMINI_UNAVAILABLE") {
    return res.status(503).json({
      success: false,
      message:
        "The AI service is temporarily unavailable. Please try again.",
      errorCode: "AI_UNAVAILABLE",
    });
  }

  // ----------------------------------------------------------
  // Network error while connecting to Gemini
  // ----------------------------------------------------------
  if (classifiedCode === "GEMINI_NETWORK_ERROR") {
    return res.status(503).json({
      success: false,
      message:
        "Unable to connect to the AI service. Please try again.",
      errorCode: "AI_NETWORK_ERROR",
    });
  }

  // ----------------------------------------------------------
  // Gemini returned invalid/unexpected JSON
  // ----------------------------------------------------------
  if (classifiedCode === "AI_BAD_RESPONSE") {
    return res.status(502).json({
      success: false,
      message:
        "The AI returned an unexpected response. Please try again.",
      errorCode: "AI_BAD_RESPONSE",
    });
  }

  // ----------------------------------------------------------
  // Unknown AI error
  // ----------------------------------------------------------
  return res.status(500).json({
    success: false,
    message: fallbackMessage,
    errorCode: classifiedCode || "AI_GENERATION_FAILED",
  });
}

// ============================================================
// BLOG SECURITY / NOTES
// ============================================================

// Blog.content is stored and rendered as plain text.
// BlogDetail.tsx renders it via a plain text node rather than
// dangerouslySetInnerHTML.
//
// React automatically escapes text content, so normal blog
// content is protected from HTML injection/XSS.
//
// CMS Pages are different because they store/render HTML and
// therefore use the HTML sanitizer.

// ============================================================
// SLUG HELPERS
// ============================================================

// Turns a title into a URL-safe slug.
//
// Example:
// "How to Get a Software Job in 2026!"
//
// becomes:
// "how-to-get-a-software-job-in-2026"
//
const slugify = (text) =>
  (text || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "post";

// ============================================================
// GENERATE UNIQUE SLUG
// ============================================================

const generateUniqueSlug = async (title, excludeId) => {
  const base = slugify(title);

  let candidate = base;
  let suffix = 2;

  while (
    await Blog.exists({
      slug: candidate,
      ...(excludeId
        ? {
            _id: {
              $ne: excludeId,
            },
          }
        : {}),
    })
  ) {
    candidate = `${base}-${suffix++}`;
  }

  return candidate;
};

// ============================================================
// OBJECT ID CHECK
// ============================================================

// Blog._id is always a valid MongoDB ObjectId.
// A slug is not.
//
// This allows the same route to accept either:
//
// /api/blogs/66abc123...
//
// OR:
//
// /api/blogs/my-first-blog
//
const isObjectId = (id) =>
  mongoose.Types.ObjectId.isValid(id) &&
  String(new mongoose.Types.ObjectId(id)) === id;

// ============================================================
// GENERATE BLOG CONTENT USING GEMINI
// ============================================================

const generateBlogContent = async (req, res) => {
  try {
    // --------------------------------------------------------
    // Get title from request
    // --------------------------------------------------------

    const { title } = req.body;

    // --------------------------------------------------------
    // Validate title
    // --------------------------------------------------------

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Title is required",
        errorCode: "TITLE_REQUIRED",
      });
    }

    // --------------------------------------------------------
    // Get shared Gemini client
    // --------------------------------------------------------

    const model = getGeminiModel();

    // --------------------------------------------------------
    // Build Gemini prompt
    // --------------------------------------------------------

    const prompt = `
      You are a professional blog writer.

      Create engaging, informative blog content based on the
      given title.

      The content should be:
      - Well-structured
      - Informative
      - Professional
      - Easy to read
      - Divided into clear paragraphs
      - Suitable for a professional job portal

      Do not return HTML.
      Do not return Markdown code fences.

      Title: ${title}
    `;

    // --------------------------------------------------------
    // Generate content
    // --------------------------------------------------------

    const result = await model.generateContent(prompt);

    // --------------------------------------------------------
    // Extract generated text
    // --------------------------------------------------------

    const generatedContent = result.response.text();

    // --------------------------------------------------------
    // Validate response
    // --------------------------------------------------------

    if (!generatedContent || !generatedContent.trim()) {
      const error = new Error(
        "Gemini returned an empty response."
      );

      error.code = "AI_BAD_RESPONSE";

      throw error;
    }

    // --------------------------------------------------------
    // Send successful response
    // --------------------------------------------------------

    return res.status(200).json({
      success: true,
      content: generatedContent.trim(),
    });
  } catch (error) {
    return friendlyAiError(
      res,
      error,
      "Failed to generate blog content"
    );
  }
};

// ============================================================
// BLOG SAVE ERROR HANDLER
// ============================================================

// Mongoose ValidationError (missing/invalid field — e.g. a manual-save
// blog with no title, or an images[] entry missing its required url) is a
// 400: the client's fault, with a specific reason. Everything else (DB
// connection drop, unexpected driver error, ...) is a genuine 500 — but
// always with the real error logged server-side, never swallowed, so a
// future failure shows up in Render logs instead of just "Failed to
// create blog" with no trace of why.
function respondBlogSaveError(res, error, { action, fallbackMessage, errorCode }) {
  console.error(`Error ${action} blog:`, error);

  if (error.name === "ValidationError") {
    const details = Object.values(error.errors || {}).map((e) => e.message);
    return res.status(400).json({
      success: false,
      message: details[0] || "Invalid blog data.",
      errorCode: "BLOG_VALIDATION_FAILED",
      details,
    });
  }

  return res.status(500).json({
    success: false,
    message: fallbackMessage,
    errorCode,
    ...(process.env.NODE_ENV !== "production" ? { debug: error.message } : {}),
  });
}

// ============================================================
// CREATE A NEW BLOG
// ============================================================

const createBlog = async (req, res) => {
  try {
    const {
      title,
      content,
      images,
      tags,
      isAIGenerated,
      category,
      excerpt,
      featuredImage,
      isPublished,
      status,
      seoTitle,
      seoDescription,
    } = req.body;

    // Manual blog creation must work even if AI was never used — validate
    // the two actually-required fields up front instead of letting a
    // missing title/content fall through to Mongoose and come back as an
    // opaque 500.
    if (!title || !String(title).trim()) {
      return res.status(400).json({
        success: false,
        message: "Title is required",
        errorCode: "TITLE_REQUIRED",
      });
    }
    if (!content || !String(content).trim()) {
      return res.status(400).json({
        success: false,
        message: "Content is required",
        errorCode: "CONTENT_REQUIRED",
      });
    }

    // Always use authenticated user.
    // Never trust author ID supplied by frontend.
    const userId = req.user.id;

    // --------------------------------------------------------
    // Get user details
    // --------------------------------------------------------

    let authorImage = "";

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // --------------------------------------------------------
    // Jobseeker profile image
    // --------------------------------------------------------

    if (user.role === "jobseeker") {
      const jobseeker = await Jobseeker.findOne({
        _id: userId,
      });

      authorImage = jobseeker?.profilePic || "";
    }

    // --------------------------------------------------------
    // Employer company logo
    // --------------------------------------------------------

    else if (user.role === "employer") {
      const employer = await Employer.findOne({
        _id: userId,
      });

      authorImage = employer?.companyLogo || "";
    }

    // --------------------------------------------------------
    // Generate unique slug
    // --------------------------------------------------------

    const slug = await generateUniqueSlug(title);

    // --------------------------------------------------------
    // Create blog
    // --------------------------------------------------------

    const blog = new Blog({
      title,
      slug,
      content,

      category:
        (category || "General").toString().trim() ||
        "General",

      excerpt:
        (excerpt || "")
          .toString()
          .trim()
          .slice(0, 300),

      featuredImage:
        featuredImage ||
        (Array.isArray(images) && images[0]?.url) ||
        "",

      author: userId,

      authorImage,

      images: images || [],

      tags: tags || [],

      isAIGenerated:
        isAIGenerated || false,

      seoTitle: (seoTitle || "").toString().trim().slice(0, 70),
      seoDescription: (seoDescription || "").toString().trim().slice(0, 160),

      // `status` (draft/published/unpublished) is the richer signal when
      // the caller sends it (the admin editor always does); `isPublished`
      // is derived from it so every existing isPublished-based visibility
      // check keeps working unchanged. Falls back to the legacy
      // isPublished-only behavior for callers that don't send `status`
      // (e.g. the AI-generation flow), and to the schema default
      // otherwise.
      ...(["draft", "published", "unpublished"].includes(status)
        ? { status, isPublished: status === "published" }
        : isPublished !== undefined
        ? { isPublished: !!isPublished, status: isPublished ? "published" : "draft" }
        : {}),
    });

    // --------------------------------------------------------
    // Save blog
    // --------------------------------------------------------

    await blog.save();

    // --------------------------------------------------------
    // Populate author information
    // --------------------------------------------------------

    await blog.populate(
      "author",
      "name email role"
    );

    // --------------------------------------------------------
    // Success response
    // --------------------------------------------------------

    return res.status(201).json({
      success: true,
      message: "Blog created successfully",
      blog,
    });
  } catch (error) {
    return respondBlogSaveError(res, error, {
      action: "creating",
      fallbackMessage: "Failed to create blog",
      errorCode: "BLOG_CREATE_FAILED",
    });
  }
};

// ============================================================
// GET ALL BLOGS
// ============================================================

const getAllBlogs = async (req, res) => {
  try {
    const page =
      parseInt(req.query.page) || 1;

    const limit =
      parseInt(req.query.limit) || 10;

    const skip =
      (page - 1) * limit;

    const search =
      req.query.search || "";

    const category =
      req.query.category || "";

    // --------------------------------------------------------
    // Only published blogs are public
    // --------------------------------------------------------

    let query = {
      isPublished: true,
    };

    // --------------------------------------------------------
    // Search
    // --------------------------------------------------------

    if (search) {
      query.$text = {
        $search: search,
      };
    }

    // --------------------------------------------------------
    // Category filter
    // --------------------------------------------------------

    if (category) {
      query.category = category;
    }

    // --------------------------------------------------------
    // Fetch blogs
    // --------------------------------------------------------

    const blogs = await Blog.find(query)
      .populate(
        "author",
        "name email role"
      )
      .sort({
        publishedAt: -1,
      })
      .skip(skip)
      .limit(limit)
      .lean();

    // --------------------------------------------------------
    // Featured image fallback
    // --------------------------------------------------------

    blogs.forEach((blog) => {
      if (!blog.featuredImage) {
        blog.featuredImage =
          blog.images?.[0]?.url || "";
      }
    });

    // --------------------------------------------------------
    // Total count
    // --------------------------------------------------------

    const total =
      await Blog.countDocuments(query);

    // --------------------------------------------------------
    // Response
    // --------------------------------------------------------

    return res.status(200).json({
      success: true,
      blogs,

      pagination: {
        currentPage: page,

        totalPages:
          Math.ceil(total / limit),

        totalBlogs: total,

        hasNext:
          page < Math.ceil(total / limit),

        hasPrev:
          page > 1,
      },
    });
  } catch (error) {
    console.error(
      "Error fetching blogs:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch blogs",
    });
  }
};

// ============================================================
// GET SINGLE BLOG
// ============================================================

const getBlogById = async (req, res) => {
  try {
    const { id } = req.params;

    const clientIp =
      req.ip ||
      req.connection.remoteAddress;

    // --------------------------------------------------------
    // Support MongoDB ObjectId OR slug
    // --------------------------------------------------------

    const lookup = isObjectId(id)
      ? { _id: id }
      : { slug: id };

    // --------------------------------------------------------
    // Fetch blog
    // --------------------------------------------------------

    // comments.author is deliberately NOT populated/returned here — the
    // full comments array could grow large, and this endpoint responds
    // with the whole blog document. The dedicated, paginated
    // GET /:id/comments (getBlogComments) is what the comments UI actually
    // reads from; this response only carries a cheap `commentCount`.
    const blog = await Blog.findOne(lookup)
      .populate(
        "author",
        "name email role"
      );

    // --------------------------------------------------------
    // Blog not found
    // --------------------------------------------------------

    if (!blog) {
      return res.status(404).json({
        message: "Blog not found",
      });
    }

    // --------------------------------------------------------
    // Draft visibility
    // --------------------------------------------------------

    const isOwner =
      req.user &&
      String(
        blog.author._id ??
          blog.author
      ) === String(req.user.id);

    const isPrivileged =
      req.user &&
      ["admin", "superadmin"].includes(
        req.user.role
      );

    if (
      !blog.isPublished &&
      !isOwner &&
      !isPrivileged
    ) {
      return res.status(404).json({
        message: "Blog not found",
      });
    }

    // --------------------------------------------------------
    // Track unique daily view by IP
    // --------------------------------------------------------

    const today = new Date();

    today.setHours(
      0,
      0,
      0,
      0
    );

    const existingView =
      blog.views.find(
        (view) =>
          view.ip === clientIp &&
          view.date >= today
      );

    if (!existingView) {
      blog.views.push({
        ip: clientIp,
        date: new Date(),
      });

      await blog.save();
    }

    // --------------------------------------------------------
    // Response-only featured image fallback
    // --------------------------------------------------------

    const responseBlog =
      blog.toObject();

    if (!responseBlog.featuredImage) {
      responseBlog.featuredImage =
        responseBlog.images?.[0]?.url ||
        "";
    }

    // Replace the raw embedded array with just a count — see the comment
    // on the query above for why the array itself isn't sent here.
    responseBlog.commentCount = (responseBlog.comments || []).filter(
      (c) => !c.isDeleted
    ).length;
    delete responseBlog.comments;

    // --------------------------------------------------------
    // Response
    // --------------------------------------------------------

    return res.status(200).json({
      success: true,
      blog: responseBlog,
    });
  } catch (error) {
    console.error(
      "Error fetching blog:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch blog",
    });
  }
};

// ============================================================
// UPDATE BLOG
// ============================================================

const updateBlog = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      title,
      content,
      images,
      tags,
      category,
      excerpt,
      featuredImage,
      isPublished,
      status,
      seoTitle,
      seoDescription,
    } = req.body;

    const userId =
      req.user.id;

    // --------------------------------------------------------
    // Find blog
    // --------------------------------------------------------

    const blog =
      await Blog.findOne(isObjectId(id) ? { _id: id } : { slug: id });

    if (!blog) {
      return res.status(404).json({
        message: "Blog not found",
      });
    }

    // --------------------------------------------------------
    // Authorization
    // --------------------------------------------------------

    const isOwner = blog.author.toString() === userId;
    const isPrivileged = req.user && ["admin", "superadmin"].includes(req.user.role);

    if (!isOwner && !isPrivileged) {
      return res.status(403).json({
        message:
          "Not authorized to update this blog",
      });
    }

    // --------------------------------------------------------
    // Update title + slug
    // --------------------------------------------------------

    if (
      title &&
      title !== blog.title
    ) {
      blog.title = title;

      blog.slug =
        await generateUniqueSlug(
          title,
          blog._id
        );
    }

    // --------------------------------------------------------
    // Update fields
    // --------------------------------------------------------

    if (
      content !== undefined
    ) {
      blog.content = content;
    }

    blog.images =
      images || blog.images;

    blog.tags =
      tags || blog.tags;

    if (
      category !== undefined
    ) {
      blog.category =
        category
          .toString()
          .trim() ||
        "General";
    }

    if (
      excerpt !== undefined
    ) {
      blog.excerpt =
        excerpt
          .toString()
          .trim()
          .slice(0, 300);
    }

    if (
      featuredImage !== undefined
    ) {
      blog.featuredImage =
        featuredImage;
    }

    if (seoTitle !== undefined) {
      blog.seoTitle = seoTitle.toString().trim().slice(0, 70);
    }
    if (seoDescription !== undefined) {
      blog.seoDescription = seoDescription.toString().trim().slice(0, 160);
    }

    // Same status/isPublished sync as createBlog — `status` (when sent)
    // is the richer source of truth, `isPublished` is derived from it.
    if (["draft", "published", "unpublished"].includes(status)) {
      blog.status = status;
      blog.isPublished = status === "published";
    } else if (isPublished !== undefined) {
      blog.isPublished = !!isPublished;
      blog.status = isPublished ? "published" : blog.status === "draft" ? "draft" : "unpublished";
    }

    // --------------------------------------------------------
    // Save
    // --------------------------------------------------------

    await blog.save();

    await blog.populate(
      "author",
      "name email role"
    );

    // --------------------------------------------------------
    // Response
    // --------------------------------------------------------

    return res.status(200).json({
      success: true,
      message:
        "Blog updated successfully",
      blog,
    });
  } catch (error) {
    return respondBlogSaveError(res, error, {
      action: "updating",
      fallbackMessage: "Failed to update blog",
      errorCode: "BLOG_UPDATE_FAILED",
    });
  }
};

// ============================================================
// DELETE BLOG
// ============================================================

const deleteBlog = async (req, res) => {
  try {
    const { id } = req.params;

    const userId =
      req.user.id;

    // --------------------------------------------------------
    // Find blog
    // --------------------------------------------------------

    const blog =
      await Blog.findOne(isObjectId(id) ? { _id: id } : { slug: id });

    if (!blog) {
      return res.status(404).json({
        message: "Blog not found",
      });
    }

    // --------------------------------------------------------
    // Authorization
    // --------------------------------------------------------

    const isOwner = blog.author.toString() === userId;
    const isPrivileged = req.user && ["admin", "superadmin"].includes(req.user.role);

    if (!isOwner && !isPrivileged) {
      return res.status(403).json({
        message:
          "Not authorized to delete this blog",
      });
    }

    // --------------------------------------------------------
    // Delete
    // --------------------------------------------------------

    await Blog.findByIdAndDelete(blog._id);

    return res.status(200).json({
      success: true,
      message:
        "Blog deleted successfully",
    });
  } catch (error) {
    console.error(
      "Error deleting blog:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to delete blog",
    });
  }
};

// ============================================================
// LIKE / UNLIKE BLOG
// ============================================================

const toggleLikeBlog = async (
  req,
  res
) => {
  try {
    const { id } =
      req.params;

    const userId =
      req.user.id;

    // --------------------------------------------------------
    // Find blog
    // --------------------------------------------------------

    const blog =
      await Blog.findOne(isObjectId(id) ? { _id: id } : { slug: id });

    if (!blog) {
      return res.status(404).json({
        message: "Blog not found",
      });
    }

    // --------------------------------------------------------
    // Find existing like
    // --------------------------------------------------------

    const likeIndex =
      blog.likes.indexOf(
        userId
      );

    // --------------------------------------------------------
    // Unlike
    // --------------------------------------------------------

    if (likeIndex > -1) {
      blog.likes.splice(
        likeIndex,
        1
      );
    }

    // --------------------------------------------------------
    // Like
    // --------------------------------------------------------

    else {
      blog.likes.push(
        userId
      );
    }

    // --------------------------------------------------------
    // Save
    // --------------------------------------------------------

    await blog.save();

    // --------------------------------------------------------
    // Response
    // --------------------------------------------------------

    return res.status(200).json({
      success: true,

      message:
        likeIndex > -1
          ? "Blog unliked"
          : "Blog liked",

      likesCount:
        blog.likes.length,

      isLiked:
        likeIndex === -1,
    });
  } catch (error) {
    console.error(
      "Error toggling like:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to toggle like",
    });
  }
};

// ============================================================
// ADD COMMENT
// ============================================================

const addComment = async (
  req,
  res
) => {
  try {
    const { id } =
      req.params;

    const { content, parentId } =
      req.body;

    const userId =
      req.user.id;

    // --------------------------------------------------------
    // Validate comment
    // --------------------------------------------------------

    if (
      !content ||
      content.trim() === ""
    ) {
      return res.status(400).json({
        message:
          "Comment content is required",
      });
    }

    // --------------------------------------------------------
    // Find blog
    // --------------------------------------------------------

    const blog =
      await Blog.findOne(isObjectId(id) ? { _id: id } : { slug: id });

    if (!blog) {
      return res.status(404).json({
        message: "Blog not found",
      });
    }

    // --------------------------------------------------------
    // Resolve reply target (one level deep only — a reply can't itself
    // be replied to, keeping the thread UI simple).
    // --------------------------------------------------------

    let parent = null;
    if (parentId) {
      const parentComment = blog.comments.id(parentId);
      if (!parentComment || parentComment.isDeleted) {
        return res.status(404).json({ message: "The comment you're replying to no longer exists." });
      }
      if (parentComment.parent) {
        return res.status(400).json({ message: "Replies can only be added to a top-level comment." });
      }
      parent = parentComment._id;
    }

    // --------------------------------------------------------
    // Add comment
    // --------------------------------------------------------

    blog.comments.push({
      author: userId,
      content:
        content.trim(),
      parent,
    });

    // --------------------------------------------------------
    // Save
    // --------------------------------------------------------

    await blog.save();

    await blog.populate(
      "comments.author",
      "name email role profilePic"
    );

    const newComment =
      blog.comments[
        blog.comments.length - 1
      ];

    // --------------------------------------------------------
    // Response
    // --------------------------------------------------------

    return res.status(201).json({
      success: true,
      message:
        "Comment added successfully",
      comment: newComment,
    });
  } catch (error) {
    console.error(
      "Error adding comment:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to add comment",
    });
  }
};

// ============================================================
// GET PAGINATED BLOG COMMENTS
// ============================================================
// Paginates top-level comments (newest first) and inlines every reply for
// just that page's comments — a blog's reply count per top-level comment
// is small in practice, so this avoids a second, fully general pagination
// system for replies. See models/Blog.js's commentSchema for the
// parent/isDeleted fields this relies on.

const BLOG_COMMENTS_PAGE_LIMIT = 10;

const getBlogComments = async (req, res) => {
  try {
    const { id } = req.params;
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || BLOG_COMMENTS_PAGE_LIMIT, 50);

    const blog = await Blog.findOne(isObjectId(id) ? { _id: id } : { slug: id })
      .select("comments")
      .populate("comments.author", "name email role profilePic");
    if (!blog) return res.status(404).json({ success: false, message: "Blog not found" });

    const viewerId = req.user?.id ? String(req.user.id) : null;
    const shapeComment = (c) => ({
      _id: c._id,
      author: c.isDeleted ? null : c.author,
      content: c.isDeleted ? "" : c.content,
      isDeleted: c.isDeleted,
      editedAt: c.editedAt || null,
      createdAt: c.createdAt,
      likeCount: c.likes?.length || 0,
      isLiked: viewerId ? c.likes?.some((u) => String(u) === viewerId) : false,
    });

    const all = blog.comments || [];
    // A deleted top-level comment with replies still shows as a tombstone
    // (isDeleted:true, content stripped) so its replies stay attached to
    // something; one with no replies is dropped entirely.
    const hasReplies = (commentId) =>
      all.some((c) => !c.isDeleted && c.parent && String(c.parent) === String(commentId));

    const topLevel = all
      .filter((c) => !c.parent && (!c.isDeleted || hasReplies(c._id)))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const total = topLevel.length;
    const pageItems = topLevel.slice((page - 1) * limit, page * limit);
    const pageIds = new Set(pageItems.map((c) => String(c._id)));

    const repliesByParent = {};
    all
      .filter((c) => !c.isDeleted && c.parent && pageIds.has(String(c.parent)))
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .forEach((c) => {
        const key = String(c.parent);
        (repliesByParent[key] ||= []).push(shapeComment(c));
      });

    const comments = pageItems.map((c) => ({
      ...shapeComment(c),
      replies: repliesByParent[String(c._id)] || [],
    }));

    res.json({
      success: true,
      comments,
      total,
      page,
      totalPages: Math.max(Math.ceil(total / limit), 1),
      hasNext: page * limit < total,
    });
  } catch (error) {
    console.error("Error fetching blog comments:", error);
    res.status(500).json({ success: false, message: "Failed to fetch comments" });
  }
};

// ============================================================
// EDIT / DELETE / LIKE A COMMENT
// ============================================================

const updateComment = async (req, res) => {
  try {
    const { id, commentId } = req.params;
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: "Comment content is required" });
    }

    const blog = await Blog.findOne(isObjectId(id) ? { _id: id } : { slug: id });
    if (!blog) return res.status(404).json({ success: false, message: "Blog not found" });

    const comment = blog.comments.id(commentId);
    if (!comment || comment.isDeleted) {
      return res.status(404).json({ success: false, message: "Comment not found" });
    }
    if (String(comment.author) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: "You can only edit your own comment" });
    }

    comment.content = content.trim();
    comment.editedAt = new Date();
    await blog.save();
    await blog.populate("comments.author", "name email role profilePic");

    res.json({ success: true, comment: blog.comments.id(commentId) });
  } catch (error) {
    console.error("Error updating comment:", error);
    res.status(500).json({ success: false, message: "Failed to update comment" });
  }
};

const deleteComment = async (req, res) => {
  try {
    const { id, commentId } = req.params;

    const blog = await Blog.findOne(isObjectId(id) ? { _id: id } : { slug: id });
    if (!blog) return res.status(404).json({ success: false, message: "Blog not found" });

    const comment = blog.comments.id(commentId);
    if (!comment || comment.isDeleted) {
      return res.status(404).json({ success: false, message: "Comment not found" });
    }

    const isOwner = String(comment.author) === String(req.user.id);
    const isPrivileged = ["admin", "superadmin"].includes(req.user.role);
    if (!isOwner && !isPrivileged) {
      return res.status(403).json({ success: false, message: "You can only delete your own comment" });
    }

    comment.isDeleted = true;
    comment.content = "";
    await blog.save();

    res.json({ success: true, message: "Comment deleted" });
  } catch (error) {
    console.error("Error deleting comment:", error);
    res.status(500).json({ success: false, message: "Failed to delete comment" });
  }
};

const toggleCommentLike = async (req, res) => {
  try {
    const { id, commentId } = req.params;
    const userId = req.user.id;

    const blog = await Blog.findOne(isObjectId(id) ? { _id: id } : { slug: id });
    if (!blog) return res.status(404).json({ success: false, message: "Blog not found" });

    const comment = blog.comments.id(commentId);
    if (!comment || comment.isDeleted) {
      return res.status(404).json({ success: false, message: "Comment not found" });
    }

    const likeIndex = comment.likes.findIndex((u) => String(u) === String(userId));
    if (likeIndex > -1) {
      comment.likes.splice(likeIndex, 1);
    } else {
      comment.likes.push(userId);
    }
    await blog.save();

    res.json({ success: true, likeCount: comment.likes.length, isLiked: likeIndex === -1 });
  } catch (error) {
    console.error("Error toggling comment like:", error);
    res.status(500).json({ success: false, message: "Failed to toggle comment like" });
  }
};

// ============================================================
// GET USER BLOGS
// ============================================================

const getUserBlogs = async (
  req,
  res
) => {
  try {
    const userId =
      req.user.id;

    const page =
      parseInt(req.query.page) ||
      1;

    const limit =
      parseInt(req.query.limit) ||
      10;

    const skip =
      (page - 1) * limit;

    // --------------------------------------------------------
    // Fetch user's blogs
    // --------------------------------------------------------

    const blogs =
      await Blog.find({
        author: userId,
      })
        .populate(
          "author",
          "name email role"
        )
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limit);

    // --------------------------------------------------------
    // Total
    // --------------------------------------------------------

    const total =
      await Blog.countDocuments({
        author: userId,
      });

    // --------------------------------------------------------
    // Response
    // --------------------------------------------------------

    return res.status(200).json({
      success: true,
      blogs,

      pagination: {
        currentPage: page,

        totalPages:
          Math.ceil(
            total / limit
          ),

        totalBlogs: total,

        hasNext:
          page <
          Math.ceil(
            total / limit
          ),

        hasPrev:
          page > 1,
      },
    });
  } catch (error) {
    console.error(
      "Error fetching user blogs:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch user blogs",
    });
  }
};

// ============================================================
// GET BLOG CATEGORIES
// ============================================================

// Distinct categories currently used by published blogs.
// This keeps the public filter based on actual database data.

const getBlogCategories = async (
  req,
  res
) => {
  try {
    const categories =
      await Blog.distinct(
        "category",
        {
          isPublished: true,
        }
      );

    return res.status(200).json({
      success: true,

      categories:
        categories
          .filter(Boolean)
          .sort(),
    });
  } catch (error) {
    console.error(
      "Error fetching blog categories:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch categories",
    });
  }
};

// ============================================================
// UPLOAD BLOG IMAGE (Cloudinary)
// ============================================================

const uploadBlogImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image file provided",
      });
    }

    const url = await persistUpload(req.file, "blog_images", req.user.id);
    return res.status(201).json({
      success: true,
      url,
    });
  } catch (error) {
    if (error.code === "CLOUD_STORAGE_NOT_CONFIGURED") {
      return res.status(503).json({
        success: false,
        message: error.message,
      });
    }
    console.error("Error uploading blog image:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to upload image",
    });
  }
};

// ============================================================
// EXPORT CONTROLLERS
// ============================================================

module.exports = {
  generateBlogContent,
  createBlog,
  getAllBlogs,
  getBlogById,
  updateBlog,
  deleteBlog,
  toggleLikeBlog,
  addComment,
  getBlogComments,
  updateComment,
  deleteComment,
  toggleCommentLike,
  getUserBlogs,
  getBlogCategories,
  uploadBlogImage,
};