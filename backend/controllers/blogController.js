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

      // Keep existing behavior.
      //
      // If isPublished is explicitly provided,
      // convert it to boolean.
      //
      // Otherwise schema default is used.
      ...(isPublished !== undefined
        ? {
            isPublished: !!isPublished,
          }
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

    const blog = await Blog.findOne(lookup)
      .populate(
        "author",
        "name email role"
      )
      .populate(
        "comments.author",
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
    } = req.body;

    const userId =
      req.user.id;

    // --------------------------------------------------------
    // Find blog
    // --------------------------------------------------------

    const blog =
      await Blog.findById(id);

    if (!blog) {
      return res.status(404).json({
        message: "Blog not found",
      });
    }

    // --------------------------------------------------------
    // Authorization
    // --------------------------------------------------------

    if (
      blog.author.toString() !==
      userId
    ) {
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

    if (
      isPublished !== undefined
    ) {
      blog.isPublished =
        !!isPublished;
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
      await Blog.findById(id);

    if (!blog) {
      return res.status(404).json({
        message: "Blog not found",
      });
    }

    // --------------------------------------------------------
    // Authorization
    // --------------------------------------------------------

    if (
      blog.author.toString() !==
      userId
    ) {
      return res.status(403).json({
        message:
          "Not authorized to delete this blog",
      });
    }

    // --------------------------------------------------------
    // Delete
    // --------------------------------------------------------

    await Blog.findByIdAndDelete(id);

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
      await Blog.findById(id);

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

    const { content } =
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
      await Blog.findById(id);

    if (!blog) {
      return res.status(404).json({
        message: "Blog not found",
      });
    }

    // --------------------------------------------------------
    // Add comment
    // --------------------------------------------------------

    blog.comments.push({
      author: userId,
      content:
        content.trim(),
    });

    // --------------------------------------------------------
    // Save
    // --------------------------------------------------------

    await blog.save();

    await blog.populate(
      "comments.author",
      "name email role"
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
  getUserBlogs,
  getBlogCategories,
  uploadBlogImage,
};