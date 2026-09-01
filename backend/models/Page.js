const mongoose = require("mongoose");

const pageSchema = new mongoose.Schema(
  {
    // Stable identifier the frontend fetches by, e.g. "privacy-policy", "terms-of-service".
    slug: { type: String, required: true, unique: true, trim: true },
    title: { type: String, required: true, trim: true },
    content: { type: String, default: "" }, // HTML from the rich text editor
    // Fields below support the generic CMS "Pages" module
    // (cmsController.js's adminListPages/adminCreatePage/etc.) — the
    // original three legal pages (privacy-policy/terms-of-service/
    // community-guidelines) also use this same model/collection and get
    // sensible defaults (status: "published") so they keep working
    // unchanged through the legacy getPage/upsertPage endpoints.
    status: { type: String, enum: ["draft", "published"], default: "published" },
    featuredImage: { type: String, default: "" },
    // Who created the page. Always set from the authenticated admin at
    // creation — never trusted from the request body.
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

pageSchema.index({ status: 1, createdAt: -1 });
pageSchema.index({ title: "text" });

module.exports = mongoose.model("Page", pageSchema);