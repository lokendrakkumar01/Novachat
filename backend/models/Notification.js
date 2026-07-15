// ============================================================
// NovaChat - Notification Schema / Model
// ============================================================
const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    type: {
      type: String,
      enum: [
        "message",
        "group_message",
        "channel_post",
        "call_incoming",
        "call_missed",
        "story_view",
        "story_reaction",
        "story_reply",
        "mention",
        "group_invite",
        "channel_invite",
        "contact_joined",
        "friend_request",
        "system",
      ],
      required: true,
    },

    title: { type: String, required: true },
    body: { type: String, required: true },
    image: { type: String, default: "" },

    // Reference to the related entity
    reference: {
      model: { type: String, enum: ["Message", "Conversation", "Group", "Channel", "Call", "Story", "User"] },
      id: { type: mongoose.Schema.Types.ObjectId },
    },

    isRead: { type: Boolean, default: false, index: true },
    readAt: Date,

    // For push notifications
    isPushed: { type: Boolean, default: false },
    pushError: { type: String, default: "" },

    // Action URL for deep linking
    actionUrl: { type: String, default: "" },

    // Priority
    priority: {
      type: String,
      enum: ["low", "normal", "high", "critical"],
      default: "normal",
    },

    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Notification = mongoose.model("Notification", notificationSchema);
module.exports = Notification;
