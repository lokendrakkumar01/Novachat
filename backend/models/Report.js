// ============================================================
// NovaChat - Report Schema
// ============================================================
const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reportedUser: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reportedMessage: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
    reportedGroup: { type: mongoose.Schema.Types.ObjectId, ref: "Group" },
    reportedStory: { type: mongoose.Schema.Types.ObjectId, ref: "Story" },

    type: {
      type: String,
      enum: ["spam", "harassment", "hate_speech", "violence", "adult_content", "misinformation", "fraud", "other"],
      required: true,
    },
    description: { type: String, maxlength: 1000, default: "" },
    evidence: [{ type: String }], // URLs to screenshots

    status: {
      type: String,
      enum: ["pending", "reviewing", "resolved", "dismissed"],
      default: "pending",
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewNote: { type: String, default: "" },
    resolvedAt: Date,

    action: {
      type: String,
      enum: ["none", "warning", "temp_ban", "permanent_ban", "content_removed"],
      default: "none",
    },
  },
  { timestamps: true }
);

reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ reporter: 1 });

const Report = mongoose.model("Report", reportSchema);
module.exports = Report;
