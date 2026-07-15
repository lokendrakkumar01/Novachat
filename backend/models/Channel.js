// ============================================================
// NovaChat - Channel Schema
// Telegram-style broadcast channels
// ============================================================
const mongoose = require("mongoose");

const channelSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Channel name is required"],
      trim: true,
      maxlength: [100, "Channel name cannot exceed 100 characters"],
    },
    handle: {
      type: String,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[a-zA-Z0-9_]+$/, "Handle can only contain letters, numbers, underscores"],
    },
    description: { type: String, maxlength: 500, default: "" },
    avatar: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
    },
    coverImage: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
    },

    // Owner and admins
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    admins: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // Subscribers
    subscribers: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        subscribedAt: { type: Date, default: Date.now },
        notifications: { type: Boolean, default: true },
      },
    ],

    // Type
    isPublic: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    category: {
      type: String,
      enum: ["news", "entertainment", "technology", "sports", "education", "business", "art", "music", "gaming", "other"],
      default: "other",
    },

    // Invite link
    inviteLink: { type: String, unique: true, sparse: true },

    // Stats
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    totalMessages: { type: Number, default: 0 },
    totalViews: { type: Number, default: 0 },

    // Settings
    settings: {
      signMessages: { type: Boolean, default: true },
      restrictedPosting: { type: Boolean, default: true }, // Only admins can post
      commentsEnabled: { type: Boolean, default: true },
    },

    tags: [String],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

channelSchema.index({ handle: 1 });
channelSchema.index({ "subscribers.user": 1 });
channelSchema.index({ isPublic: 1 });
channelSchema.index({ name: "text", description: "text" });

channelSchema.virtual("subscriberCount").get(function () {
  return this.subscribers ? this.subscribers.length : 0;
});

const Channel = mongoose.model("Channel", channelSchema);
module.exports = Channel;
