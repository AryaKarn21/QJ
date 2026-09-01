const mongoose = require("mongoose");

const bookmarkSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    post: { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true },
    // Lightweight folders so a jobseeker can separate e.g. "Interview prep"
    // from "Jobs to apply". Optional — defaults to a single unsorted list.
    collectionName: { type: String, trim: true, default: "General" },
  },
  { timestamps: true }
);

bookmarkSchema.index({ user: 1, post: 1 }, { unique: true });

module.exports = mongoose.model("Bookmark", bookmarkSchema);
