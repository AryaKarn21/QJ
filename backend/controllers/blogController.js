const mongoose = require("mongoose");
const Blog = require("../models/Blog");
const User = require("../models/User");
const Jobseeker = require("../models/Jobseeker");
const { getGeminiModel } = require("../utils/geminiClient");
const Employer = require("../models/Employer");

// Same pattern communityAiController.js already uses for every other AI
// feature: a missing API key is a 503 with a clear, actionable message,
// not a 500 with a raw SDK error leaked to the client.
function friendlyAiError(res, error, fallbackMessage) {
  if (error.code === "GEMINI_NOT_CONFIGURED") {
    return res.status(503).json({ message: "AI features aren't configured yet. Add GEMINI_API_KEY to the backend .env file." });
  }
  console.error(fallbackMessage, error);
  return res.status(500).json({ message: fallbackMessage });
}
// NOTE: Blog.content is stored and rendered as plain text (BlogDetail.tsx
// renders it via a plain text node, not dangerouslySetInnerHTML — there's
// no rich text editor here), so it's inherently XSS-safe via React's
// default escaping and deliberately NOT run through sanitizeHtml.js's
// HTML sanitizer, which would mangle legitimate text containing "<"/">".
// That sanitizer is used by the CMS Pages module instead, which actually
// stores/renders HTML from ReactQuill.

// Turns a title into a URL-safe slug: lowercase, non-alphanumerics to
// hyphens, no leading/trailing/duplicate hyphens.
const slugify = (text) =>
  (text || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "post";

// Ensures uniqueness by appending -2, -3, ... on collision. `excludeId` lets
// updateBlog re-check a slug without colliding with the document itself.
const generateUniqueSlug = async (title, excludeId) => {
  const base = slugify(title);
  let candidate = base;
  let suffix = 2;
  while (
    await Blog.exists({ slug: candidate, ...(excludeId ? { _id: { $ne: excludeId } } : {}) })
  ) {
    candidate = `${base}-${suffix++}`;
  }
  return candidate;
};

// Blog._id is always a valid ObjectId; a slug never is — this lets a
// single param support both without a second route.
const isObjectId = (id) => mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === id;

// Generate blog content using Gemini

const generateBlogContent = async (req, res) => {
  try {
    const { title } = req.body;

    if (!title) {
      return res.status(400).json({ message: "Title is required" });
    }

    // Shared client (utils/geminiClient.js) — same model/config every
    // other AI feature in the app uses, instead of this being the one
    // place with its own separate GoogleGenerativeAI instance and a
    // different (and previously mismatched) model name.
    const model = getGeminiModel();

    // Build the prompt
    const prompt = `
      You are a professional blog writer.
      Create engaging, informative blog content based on the given title.
      The content should be well-structured with clear paragraphs and professional tone.
      Title: ${title}
    `;

    // Generate content
    const result = await model.generateContent(prompt);
    const generatedContent = result.response.text();

    res.status(200).json({
      success: true,
      content: generatedContent,
    });
  } catch (error) {
    return friendlyAiError(res, error, "Failed to generate blog content");
  }
};



// Create a new blog
const createBlog = async (req, res) => {
  try {
    const { title, content, images, tags, isAIGenerated, category, excerpt, featuredImage, isPublished } = req.body;
    // `author` is always the authenticated user — never trust a frontend-
    // supplied author id here.
    const userId = req.user.id;

    // Get user details to set author image
    let authorImage = "";
    const user = await User.findById(userId);

    if (user.role === "jobseeker") {
      const jobseeker = await Jobseeker.findOne({ _id: userId });
      authorImage = jobseeker?.profilepic || "";
    } else if (user.role === "employer") {
      const employer = await Employer.findOne({ _id: userId });
      authorImage = employer?.companylogo || "";
    }

    const slug = await generateUniqueSlug(title);

    const blog = new Blog({
      title,
      slug,
      content,
      category: (category || "General").toString().trim() || "General",
      excerpt: (excerpt || "").toString().trim().slice(0, 300),
      featuredImage: featuredImage || (Array.isArray(images) && images[0]?.url) || "",
      author: userId,
      authorImage,
      images: images || [],
      tags: tags || [],
      isAIGenerated: isAIGenerated || false,
      // Defaults to true (the schema's existing default, and prior
      // behavior) so any caller not passing this — e.g. the AI-generated
      // flow — keeps publishing immediately. An author who explicitly
      // wants to "Save as Draft" passes isPublished:false.
      ...(isPublished !== undefined ? { isPublished: !!isPublished } : {}),
    });

    await blog.save();
    await blog.populate("author", "name email role");

    res.status(201).json({
      success: true,
      message: "Blog created successfully",
      blog,
    });
  } catch (error) {
    console.error("Error creating blog:", error);
    res.status(500).json({
      message: "Failed to create blog",
      error: error.message,
    });
  }
};

// Get all blogs with pagination
const getAllBlogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";
    const category = req.query.category || "";

    let query = { isPublished: true };

    if (search) {
      query.$text = { $search: search };
    }
    if (category) {
      query.category = category;
    }

    const blogs = await Blog.find(query)
      .populate("author", "name email role")
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Older posts predate `featuredImage` — fall back to the first gallery
    // image so the public list/cards always have something to show.
    blogs.forEach((b) => {
      if (!b.featuredImage) b.featuredImage = b.images?.[0]?.url || "";
    });

    const total = await Blog.countDocuments(query);

    res.status(200).json({
      success: true,
      blogs,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalBlogs: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching blogs:", error);
    res.status(500).json({
      message: "Failed to fetch blogs",
      error: error.message,
    });
  }
};

// Get single blog by ID
const getBlogById = async (req, res) => {
  try {
    const { id } = req.params;
    const clientIp = req.ip || req.connection.remoteAddress;

    // Accepts either the Mongo _id or the slug, so /api/blogs/:id serves
    // both the legacy id-based links and new slug-based ones without a
    // second route.
    const lookup = isObjectId(id) ? { _id: id } : { slug: id };
    const blog = await Blog.findOne(lookup)
      .populate("author", "name email role")
      .populate("comments.author", "name email role");

    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    // Draft/unpublished posts are only visible to their author or an
    // admin — everyone else (including anonymous requests) gets the same
    // 404 a nonexistent post would, so a draft's existence isn't leaked.
    const isOwner = req.user && String(blog.author._id ?? blog.author) === String(req.user.id);
    const isPrivileged = req.user && ["admin", "superadmin"].includes(req.user.role);
    if (!blog.isPublished && !isOwner && !isPrivileged) {
      return res.status(404).json({ message: "Blog not found" });
    }

    // Add view if not already viewed by this IP today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingView = blog.views.find(
      view => view.ip === clientIp && view.date >= today
    );

    if (!existingView) {
      blog.views.push({ ip: clientIp, date: new Date() });
      await blog.save();
    }

    // Fallback computed for the response only — not persisted, so it
    // doesn't get bundled into the view-tracking save above.
    const responseBlog = blog.toObject();
    if (!responseBlog.featuredImage) {
      responseBlog.featuredImage = responseBlog.images?.[0]?.url || "";
    }

    res.status(200).json({
      success: true,
      blog: responseBlog,
    });
  } catch (error) {
    console.error("Error fetching blog:", error);
    res.status(500).json({
      message: "Failed to fetch blog",
      error: error.message,
    });
  }
};

// Update blog
const updateBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, images, tags, category, excerpt, featuredImage, isPublished } = req.body;
    const userId = req.user.id;

    const blog = await Blog.findById(id);

    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    // Check if user is the author
    if (blog.author.toString() !== userId) {
      return res.status(403).json({ message: "Not authorized to update this blog" });
    }

    if (title && title !== blog.title) {
      blog.title = title;
      blog.slug = await generateUniqueSlug(title, blog._id);
    }
    if (content !== undefined) blog.content = content;
    blog.images = images || blog.images;
    blog.tags = tags || blog.tags;
    if (category !== undefined) blog.category = category.toString().trim() || "General";
    if (excerpt !== undefined) blog.excerpt = excerpt.toString().trim().slice(0, 300);
    if (featuredImage !== undefined) blog.featuredImage = featuredImage;
    // Author-controlled draft/publish toggle — the admin-only moderation
    // toggle in cmsController.js (adminTogglePublishBlog) is separate and
    // unaffected by this.
    if (isPublished !== undefined) blog.isPublished = !!isPublished;

    await blog.save();
    await blog.populate("author", "name email role");

    res.status(200).json({
      success: true,
      message: "Blog updated successfully",
      blog,
    });
  } catch (error) {
    console.error("Error updating blog:", error);
    res.status(500).json({
      message: "Failed to update blog",
      error: error.message,
    });
  }
};

// Delete blog
const deleteBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const blog = await Blog.findById(id);

    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    // Check if user is the author
    if (blog.author.toString() !== userId) {
      return res.status(403).json({ message: "Not authorized to delete this blog" });
    }

    await Blog.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Blog deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting blog:", error);
    res.status(500).json({
      message: "Failed to delete blog",
      error: error.message,
    });
  }
};

// Like/Unlike blog
const toggleLikeBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const blog = await Blog.findById(id);

    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    const likeIndex = blog.likes.indexOf(userId);

    if (likeIndex > -1) {
      // Unlike
      blog.likes.splice(likeIndex, 1);
    } else {
      // Like
      blog.likes.push(userId);
    }

    await blog.save();

    res.status(200).json({
      success: true,
      message: likeIndex > -1 ? "Blog unliked" : "Blog liked",
      likesCount: blog.likes.length,
      isLiked: likeIndex === -1,
    });
  } catch (error) {
    console.error("Error toggling like:", error);
    res.status(500).json({
      message: "Failed to toggle like",
      error: error.message,
    });
  }
};

// Add comment to blog
const addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content || content.trim() === "") {
      return res.status(400).json({ message: "Comment content is required" });
    }

    const blog = await Blog.findById(id);

    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    blog.comments.push({
      author: userId,
      content: content.trim(),
    });

    await blog.save();
    await blog.populate("comments.author", "name email role");

    const newComment = blog.comments[blog.comments.length - 1];

    res.status(201).json({
      success: true,
      message: "Comment added successfully",
      comment: newComment,
    });
  } catch (error) {
    console.error("Error adding comment:", error);
    res.status(500).json({
      message: "Failed to add comment",
      error: error.message,
    });
  }
};

// Get user's blogs
const getUserBlogs = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const blogs = await Blog.find({ author: userId })
      .populate("author", "name email role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Blog.countDocuments({ author: userId });

    res.status(200).json({
      success: true,
      blogs,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalBlogs: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching user blogs:", error);
    res.status(500).json({
      message: "Failed to fetch user blogs",
      error: error.message,
    });
  }
};

// Distinct categories in use among published posts, for the public blog
// listing's filter dropdown — real data, not a hardcoded list.
const getBlogCategories = async (req, res) => {
  try {
    const categories = await Blog.distinct("category", { isPublished: true });
    res.status(200).json({ success: true, categories: categories.filter(Boolean).sort() });
  } catch (error) {
    console.error("Error fetching blog categories:", error);
    res.status(500).json({ message: "Failed to fetch categories", error: error.message });
  }
};

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
};
