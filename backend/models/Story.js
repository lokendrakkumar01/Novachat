// ============================================================
// NovaChat - Story Schema / Model
// WhatsApp/Instagram style stories (24hr expiry)
// ============================================================
const mongoose = require("mongoose");

const storySchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Story content type
    type: {
      type: String,
      enum: ["image", "video", "text"],
      required: true,
    },

    // Media
    media: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
      thumbnail: { type: String, default: "" },
      duration: { type: Number, default: 0 }, // for video
    },

    // Text story
    text: {
      content: { type: String, maxlength: 500, default: "" },
      fontSize: { type: Number, default: 24 },
      fontFamily: { type: String, default: "Inter" },
      color: { type: String, default: "#FFFFFF" },
      backgroundColor: { type: String, default: "#6366f1" },
      alignment: { type: String, enum: ["left", "center", "right"], default: "center" },
      backgroundType: { type: String, enum: ["solid", "gradient"], default: "gradient" },
      gradient: { type: String, default: "" },
    },

    // Caption for media stories
    caption: { type: String, maxlength: 300, default: "" },
    textOverlay: { type: String, default: "" },

    // Privacy
    visibility: {
      type: String,
      enum: ["everyone", "contacts", "custom", "close_friends"],
      default: "contacts",
    },
    visibleTo: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    hiddenFrom: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // Views
    views: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        viewedAt: { type: Date, default: Date.now },
      },
    ],

    // Reactions
    reactions: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        emoji: { type: String },
        reactedAt: { type: Date, default: Date.now },
      },
    ],

    // Comments / Replies
    replies: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        message: { type: String, maxlength: 500 },
        repliedAt: { type: Date, default: Date.now },
      },
    ],

    // Music
    music: {
      title: String,
      artist: String,
      url: String,
      startTime: Number,
    },

    // Link
    link: { type: String, default: "" },

    // 24-hour expiry
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
      index: { expireAfterSeconds: 0 }, // TTL index
    },

    isActive: { type: Boolean, default: true },
    isHighlighted: { type: Boolean, default: false },
    highlightName: { type: String, default: "" },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

storySchema.index({ author: 1, createdAt: -1 });
storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

storySchema.virtual("viewCount").get(function () {
  return this.views ? this.views.length : 0;
});

const Story = mongoose.model("Story", storySchema);
module.exports = Story;
