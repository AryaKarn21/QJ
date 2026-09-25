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
  // Points at another subdocument's `_id` within the same `comments` array
  // — one reply level (a reply can't itself be replied to), enforced in
  // blogController.js's addComment. null/absent for a top-level comment.
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  likes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  // Soft delete so replies to a deleted top-level comment don't get
  // orphaned — see blogController.js's getBlogComments for how a deleted
  // comment with replies still renders as a "[deleted]" tombstone.
  isDeleted: {
    type: Boolean,
    default: false,
  },
  editedAt: {
    type: Date,
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
    // Richer tri-state alongside `isPublished` (which stays the single
    // source of truth for "is this publicly visible" everywhere else in
    // the codebase — getAllBlogs/getBlogById's visibility checks are
    // unchanged). `status` only exists so the admin UI can tell "never
    // published" apart from "was published, then taken down" instead of
    // both collapsing into the same isPublished:false. Kept in sync with
    // isPublished in blogController.js's createBlog/updateBlog and
    // adminController.js's updateBlogStatusAdmin — never edit one without
    // the other.
    status: {
      type: String,
      enum: ["draft", "published", "unpublished"],
      default: "published",
    },
    // SEO meta fields for the public blog page's <title>/<meta
    // name="description">. Optional — falls back to `title`/`excerpt` at
    // render time when blank.
    seoTitle: {
      type: String,
      trim: true,
      maxlength: 70,
      default: "",
    },
    seoDescription: {
      type: String,
      trim: true,
      maxlength: 160,
      default: "",
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
