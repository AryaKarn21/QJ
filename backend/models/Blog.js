const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  content: {
    type: String,
    required: true,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    // URL-safe identifier for /blog/:slug. Sparse+unique so pre-existing
    // blogs (created before this field existed) don't collide on `null`
    // until backfillBlogSlugs.js gives every one a real value — see that
    // script for the migration.
    slug: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true,
    },
    content: {
      type: String,
      required: true,
    },
    // Short summary shown on cards/listing pages. Falls back to a
    // truncated `content` at read time when empty — not backfilled here,
    // since that's a display concern, not stored data.
    excerpt: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "",
    },
    // Free-text taxonomy (not a separate model — there's no existing
    // BlogCategory concept in this codebase, and one hardcoded field is
    // enough for filtering without introducing a second admin-managed
    // taxonomy alongside JobCategory).
    category: {
      type: String,
      trim: true,
      default: "General",
    },
    // Single hero image for cards/detail headers, distinct from the
    // `images[]` in-body gallery below. Optional — falls back to
    // `images[0].url` at read time if unset (see getAllBlogs/getBlogById).
    featuredImage: {
      type: String,
      default: "",
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    authorImage: {
      type: String, // Will store profilepic or companylogo URL
    },
    images: [
      {
        url: { type: String, required: true },
        caption: { type: String },
      }
    ],
    tags: [
      {
        type: String,
        trim: true,
      }
    ],
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      }
    ],
    comments: [commentSchema],
    views: [
      {
        ip: { type: String, required: true },
        date: { type: Date, required: true, default: Date.now },
      }
    ],
    isPublished: {
      type: Boolean,
      default: true,
    },
    publishedAt: {
      type: Date,
      default: Date.now,
    },
    isAIGenerated: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for better performance
blogSchema.index({ author: 1, publishedAt: -1 });
blogSchema.index({ title: "text", content: "text" });
blogSchema.index({ category: 1, isPublished: 1 });

module.exports = mongoose.model("Blog", blogSchema);
