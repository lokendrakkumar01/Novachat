// ============================================================
// NovaChat - Message Schema / Model
// Handles all types of messages across conversations/groups
// ============================================================
const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    // Sender
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Where this message belongs
    conversationType: {
      type: String,
      enum: ["private", "group", "channel"],
      required: true,
    },
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      index: true,
    },
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      index: true,
    },
    channel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Channel",
      index: true,
    },

    // Message Content
    type: {
      type: String,
      enum: [
        "text", "image", "video", "audio", "document",
        "voice", "location", "contact", "sticker",
        "gif", "poll", "event", "system",
      ],
      default: "text",
    },
    content: {
      type: String,
      maxlength: [5000, "Message content cannot exceed 5000 characters"],
      default: "",
    },

    // Media (images, videos, audio, docs)
    media: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
      type: { type: String, default: "" }, // MIME type
      name: { type: String, default: "" }, // original filename
      size: { type: Number, default: 0 }, // bytes
      duration: { type: Number, default: 0 }, // for audio/video (seconds)
      thumbnail: { type: String, default: "" }, // for videos
      width: { type: Number, default: 0 },
      height: { type: Number, default: 0 },
    },

    // Location
    location: {
      lat: Number,
      lng: Number,
      address: String,
    },

    // Reply to another message
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },

    // Forwarded from
    forwardedFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    isForwarded: { type: Boolean, default: false },

    // Reactions: { userId: emoji }
    reactions: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        emoji: { type: String },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // Message status
    deliveredTo: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        at: { type: Date, default: Date.now },
      },
    ],
    readBy: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        at: { type: Date, default: Date.now },
      },
    ],

    // Edit history
    isEdited: { type: Boolean, default: false },
    editHistory: [
      {
        content: String,
        editedAt: { type: Date, default: Date.now },
      },
    ],

    // Deletion
    isDeleted: { type: Boolean, default: false },
    deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // "Delete for me"
    deletedForEveryone: { type: Boolean, default: false },
    deletedAt: Date,

    // Pin
    isPinned: { type: Boolean, default: false },
    pinnedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    pinnedAt: Date,

    // Star / Bookmark
    starredBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // Mentions
    mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // For system messages (user joined, left, etc.)
    systemData: {
      action: String,
      target: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },

    // Scheduled message
    isScheduled: { type: Boolean, default: false },
    scheduledAt: Date,
    isSent: { type: Boolean, default: true },

    // AI-generated
    isAI: { type: Boolean, default: false },
    aiSummary: { type: String, default: "" },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ============================================================
// Indexes for performance
// ============================================================
messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ group: 1, createdAt: -1 });
messageSchema.index({ channel: 1, createdAt: -1 });
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ content: "text" }); // Full-text search
messageSchema.index({ isPinned: 1 });
messageSchema.index({ isDeleted: 1 });

const Message = mongoose.model("Message", messageSchema);
module.exports = Message;
