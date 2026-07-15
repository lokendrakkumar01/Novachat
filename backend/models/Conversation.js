// ============================================================
// NovaChat - Conversation Schema (Private/Direct Messages)
// ============================================================
const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],

    // Last message reference for preview
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },

    // Unread count per participant
    unreadCount: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        count: { type: Number, default: 0 },
      },
    ],

    // Muted by which users
    mutedBy: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        until: { type: Date, default: null }, // null = forever
      },
    ],

    // Pinned by which users
    pinnedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // Archived by which users
    archivedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // Deleted for which users (soft delete)
    deletedFor: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        deletedAt: { type: Date, default: Date.now },
      },
    ],

    // Chat wallpaper per user
    wallpapers: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        wallpaper: String,
      },
    ],

    // Encryption
    isEncrypted: { type: Boolean, default: true },
    encryptionKey: { type: String, select: false },

    // Typing status (ephemeral, managed by socket)
    typingUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ============================================================
// Indexes
// ============================================================
conversationSchema.index({ participants: 1 });
conversationSchema.index({ updatedAt: -1 });
conversationSchema.index({ "lastMessage": 1 });

// Ensure unique conversation between 2 users
conversationSchema.index({ participants: 1 }, { unique: false });

const Conversation = mongoose.model("Conversation", conversationSchema);
module.exports = Conversation;
