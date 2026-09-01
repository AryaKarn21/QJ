const mongoose = require("mongoose");

// A single community post. One schema handles all post "types" via a
// discriminated `type` field with type-specific optional sub-objects
// (pollData / jobData / hiringData) rather than separate Mongoose
// discriminators — the feed needs to render a mixed list of every type
// together, which is far simpler against one collection/shape.
const pollOptionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true, maxlength: 120 },
    votes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { _id: true }
);

const postSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    authorRole: {
      type: String,
      enum: ["jobseeker", "employer", "recruiter", "mentor", "admin", "superadmin"],
      required: true,
    },
    // A post can optionally be published "as" a company page (employer
    // posting under their company identity rather than personal name) —
    // powers the Company Feed. Points at the employer User document.
    company: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },

    type: {
      type: String,
      enum: ["text", "image", "video", "pdf", "job", "poll", "hiring"],
      required: true,
      default: "text",
    },

    content: { type: String, trim: true, maxlength: 5000, default: "" },

    // Populated for image/video/pdf posts (and optionally alongside any
    // other type, e.g. a text post with an attached image).
    media: [
      {
        url: { type: String, required: true },
        mimeType: { type: String },
        fileName: { type: String },
        sizeBytes: { type: Number },
        // width/height/duration are best-effort metadata for the frontend
        // to lay out media without layout shift; not all uploads have them.
        width: { type: Number },
        height: { type: Number },
        durationSeconds: { type: Number },
      },
    ],

    hashtags: [{ type: String, lowercase: true, trim: true, index: true }],
    mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // --- type: "job" -----------------------------------------------------
    // A lightweight, self-contained job snippet for the feed. Optionally
    // linked to a real Job document (posted via the full job-posting flow)
    // so "Apply" can route straight into the existing application system.
    jobData: {
      job: { type: mongoose.Schema.Types.ObjectId, ref: "Job", default: null },
      title: { type: String, trim: true },
      companyName: { type: String, trim: true },
      location: { type: String, trim: true },
      jobType: { type: String, trim: true },
      salary: { type: String, trim: true },
      applyUrl: { type: String, trim: true },
    },

    // --- type: "hiring" ----------------------------------------------------
    // "We're hiring" announcement posts — distinct from a formal job post:
    // meant for reach/awareness, e.g. "hiring 5 backend engineers, DM me".
    hiringData: {
      roles: [{ type: String, trim: true }],
      openings: { type: Number },
      location: { type: String, trim: true },
      urgency: { type: String, enum: ["normal", "urgent"], default: "normal" },
      applyUrl: { type: String, trim: true },
      contactEmail: { type: String, trim: true },
    },

    // --- type: "poll" -------------------------------------------------
    pollData: {
      options: [pollOptionSchema],
      expiresAt: { type: Date },
      allowMultiple: { type: Boolean, default: false },
    },

    // Career-community topical filters. Author-chosen at compose time,
    // and/or inferred client-side from hashtags — used to power the
    // "Interview Experiences" / "Career Tips" / "Hiring" feed filters
    // in addition to whatever hashtags a post carries.
    topics: [
      {
        type: String,
        enum: ["career_tips", "interview_experience", "hiring", "general"],
      },
    ],

    // Enforced server-side for every read path — see utils/postVisibility.js.
    // "connections" checks the Connection model (models/Connection.js), NOT
    // Follow — a follower is not automatically a connection.
    visibility: {
      type: String,
      enum: ["public", "followers", "connections", "private"],
      default: "public",
    },

    // Denormalized counters kept in sync by the controllers on every
    // like/comment/share/bookmark write, so feed queries never need a
    // second aggregation just to render counts.
    likeCount: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
    shareCount: { type: Number, default: 0 },
    bookmarkCount: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },

    // Reposts/shares: a share creates a new Post with `sharedFrom` set and
    // its own (usually empty) `content` as the sharer's commentary.
    sharedFrom: { type: mongoose.Schema.Types.ObjectId, ref: "Post", default: null },

    // --- AI ---------------------------------------------------------
    aiGenerated: { type: Boolean, default: false }, // caption/content assisted by AI
    aiSummary: { type: String, trim: true, maxlength: 600, default: "" },
    aiSummaryGeneratedAt: { type: Date },

    moderation: {
      status: {
        type: String,
        enum: ["approved", "pending", "flagged", "removed"],
        default: "approved",
        index: true,
      },
      flags: [{ type: String }], // e.g. ["hate_speech"], ["spam"], ["nudity"]
      reason: { type: String, trim: true },
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      reviewedAt: { type: Date },
    },

    isPinned: { type: Boolean, default: false },
    isEdited: { type: Boolean, default: false },
    editedAt: { type: Date },
    isDeleted: { type: Boolean, default: false }, // soft delete — keeps comment/like history intact
  },
  { timestamps: true }
);

postSchema.index({ createdAt: -1 });
postSchema.index({ hashtags: 1, createdAt: -1 });
postSchema.index({ topics: 1, createdAt: -1 });
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ "moderation.status": 1, createdAt: -1 });
// Lightweight text index so a future search box can query content directly.
postSchema.index({ content: "text" });

module.exports = mongoose.model("Post", postSchema);
