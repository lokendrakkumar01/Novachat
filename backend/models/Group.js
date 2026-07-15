// ============================================================
// NovaChat - Group Schema / Model
// ============================================================
const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Group name is required"],
      trim: true,
      maxlength: [100, "Group name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: "",
    },
    avatar: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
    },
    coverImage: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
    },

    // Creator
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Members with roles
    members: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        role: { type: String, enum: ["member", "admin", "owner"], default: "member" },
        joinedAt: { type: Date, default: Date.now },
        addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        mutedUntil: { type: Date, default: null },
        nickname: { type: String, default: "" },
        isPinned: { type: Boolean, default: false },
      },
    ],

    // Invite link
    inviteLink: { type: String, unique: true, sparse: true },
    inviteLinkExpiry: Date,
    inviteLinkEnabled: { type: Boolean, default: true },

    // Settings
    settings: {
      onlyAdminsCanMessage: { type: Boolean, default: false },
      onlyAdminsCanEditInfo: { type: Boolean, default: false },
      onlyAdminsCanAddMembers: { type: Boolean, default: false },
      approvalRequired: { type: Boolean, default: false },
      disappearingMessages: { type: Number, default: 0 }, // seconds, 0 = off
      maxMembers: { type: Number, default: 1024 },
    },

    // Last message
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },

    // Pinned messages
    pinnedMessages: [{ type: mongoose.Schema.Types.ObjectId, ref: "Message" }],

    // Type
    type: { type: String, enum: ["group", "supergroup"], default: "group" },

    isPublic: { type: Boolean, default: false },
    tags: [String],

    // Stats
    totalMessages: { type: Number, default: 0 },

    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
groupSchema.index({ "members.user": 1 });
groupSchema.index({ createdBy: 1 });
groupSchema.index({ inviteLink: 1 });
groupSchema.index({ name: "text", description: "text" });

// Virtual: member count
groupSchema.virtual("memberCount").get(function () {
  return this.members ? this.members.length : 0;
});

const Group = mongoose.model("Group", groupSchema);
module.exports = Group;
