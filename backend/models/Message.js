const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, trim: true, maxlength: 5000, default: "" },
    attachments: [
      {
        url: { type: String, required: true },
        mimeType: { type: String },
        fileName: { type: String },
        size: { type: Number },
      },
    ],
    // "call" messages are system-style log entries created after a voice/
    // video call ends (see messageController.logCall) — they render as a
    // distinct bubble (phone icon + duration/status) instead of chat text,
    // which is how the call becomes visible in the conversation itself.
    type: { type: String, enum: ["text", "call"], default: "text" },
    call: {
      callType: { type: String, enum: ["audio", "video"] },
      status: { type: String, enum: ["completed", "missed", "declined"] },
      duration: { type: Number, default: 0 }, // seconds
    },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

messageSchema.index({ conversation: 1, createdAt: -1 });

module.exports = mongoose.model("Message", messageSchema);
