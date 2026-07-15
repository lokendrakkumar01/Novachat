// ============================================================
// NovaChat - Community Schema (Discord-like servers)
// ============================================================
const mongoose = require("mongoose");

const communitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    handle: { type: String, unique: true, trim: true, lowercase: true },
    description: { type: String, maxlength: 1000, default: "" },
    avatar: { url: String, publicId: String },
    banner: { url: String, publicId: String },

    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // Roles within community
    roles: [
      {
        name: String,
        color: String,
        permissions: [String],
        position: Number,
      },
    ],

    // Members
    members: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        roles: [String],
        nickname: String,
        joinedAt: { type: Date, default: Date.now },
        isBanned: { type: Boolean, default: false },
      },
    ],

    // Channels within community
    channels: [
      {
        name: String,
        type: { type: String, enum: ["text", "voice", "announcement", "forum"] },
        description: String,
        position: Number,
        isPrivate: Boolean,
        allowedRoles: [String],
        group: { type: mongoose.Schema.Types.ObjectId }, // Channel category
      },
    ],

    // Channel categories
    categories: [
      {
        name: String,
        position: Number,
      },
    ],

    isPublic: { type: Boolean, default: true },
    inviteLink: { type: String, unique: true, sparse: true },
    isVerified: { type: Boolean, default: false },
    category: String,
    tags: [String],

    settings: {
      defaultRole: String,
      verificationLevel: { type: String, enum: ["none", "low", "medium", "high"], default: "none" },
      contentFilter: { type: String, enum: ["none", "members_without_roles", "all_members"], default: "none" },
      systemMessagesChannel: String,
    },

    isActive: { type: Boolean, default: true },
    totalMessages: { type: Number, default: 0 },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

communitySchema.index({ handle: 1 });
communitySchema.index({ "members.user": 1 });
communitySchema.virtual("memberCount").get(function () {
  return this.members ? this.members.length : 0;
});

const Community = mongoose.model("Community", communitySchema);
module.exports = Community;
