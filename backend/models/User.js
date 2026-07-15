// ============================================================
// NovaChat - User Schema / Model
// Complete user data model with all fields
// ============================================================
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    // Basic Info
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [30, "Username cannot exceed 30 characters"],
      match: [/^[a-zA-Z0-9._]+$/, "Username can only contain letters, numbers, dots and underscores"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Invalid email address"],
    },
    phone: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    password: {
      type: String,
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
    },

    // Profile
    displayName: {
      type: String,
      trim: true,
      maxlength: [50, "Display name cannot exceed 50 characters"],
    },
    bio: {
      type: String,
      maxlength: [200, "Bio cannot exceed 200 characters"],
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

    // Auth
    googleId: { type: String, sparse: true },
    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },

    // Verification
    isEmailVerified: { type: Boolean, default: false },
    isPhoneVerified: { type: Boolean, default: false },
    emailOTP: { type: String, select: false },
    emailOTPExpiry: { type: Date, select: false },
    phoneOTP: { type: String, select: false },
    phoneOTPExpiry: { type: Date, select: false },

    // Password Reset
    passwordResetToken: { type: String, select: false },
    passwordResetExpiry: { type: Date, select: false },

    // Refresh Token
    refreshToken: { type: String, select: false },

    // Status
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },
    statusText: { type: String, default: "", maxlength: 100 },
    statusEmoji: { type: String, default: "💬" },

    // Contacts & Blocking
    contacts: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    blockedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // Privacy Settings
    privacy: {
      lastSeen: { type: String, enum: ["everyone", "contacts", "nobody"], default: "everyone" },
      profilePhoto: { type: String, enum: ["everyone", "contacts", "nobody"], default: "everyone" },
      about: { type: String, enum: ["everyone", "contacts", "nobody"], default: "everyone" },
      status: { type: String, enum: ["everyone", "contacts", "nobody"], default: "everyone" },
      readReceipts: { type: Boolean, default: true },
      groupInvites: { type: String, enum: ["everyone", "contacts"], default: "everyone" },
    },

    // Notification Settings
    notifications: {
      messages: { type: Boolean, default: true },
      calls: { type: Boolean, default: true },
      stories: { type: Boolean, default: true },
      mentions: { type: Boolean, default: true },
      sound: { type: Boolean, default: true },
      vibration: { type: Boolean, default: true },
    },

    // App Settings
    settings: {
      theme: { type: String, enum: ["dark", "light", "system"], default: "dark" },
      language: { type: String, default: "en" },
      fontSize: { type: String, enum: ["small", "medium", "large"], default: "medium" },
      wallpaper: { type: String, default: "" },
      enterToSend: { type: Boolean, default: true },
      autoDownloadImages: { type: Boolean, default: true },
      autoDownloadVideos: { type: Boolean, default: false },
      autoDownloadDocuments: { type: Boolean, default: false },
    },

    // Roles
    role: {
      type: String,
      enum: ["user", "admin", "superadmin"],
      default: "user",
    },
    isVerifiedAccount: { type: Boolean, default: false }, // Blue tick
    isBanned: { type: Boolean, default: false },
    banReason: { type: String, default: "" },

    // Stats
    totalMessages: { type: Number, default: 0 },
    totalCalls: { type: Number, default: 0 },
    storageUsed: { type: Number, default: 0 }, // in bytes

    // Push Notifications
    pushTokens: [{ type: String }],
    socketId: { type: String, default: "" },
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
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ isOnline: 1 });
userSchema.index({ role: 1 });
userSchema.index({ createdAt: -1 });

// ============================================================
// Virtual fields
// ============================================================
userSchema.virtual("contactCount").get(function () {
  return this.contacts ? this.contacts.length : 0;
});

// ============================================================
// Pre-save middleware: Hash password
// ============================================================
userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ============================================================
// Instance method: Compare password
// ============================================================
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// ============================================================
// Instance method: Get public profile (sanitized)
// ============================================================
userSchema.methods.getPublicProfile = function () {
  return {
    _id: this._id,
    username: this.username,
    displayName: this.displayName,
    email: this.email,
    phone: this.phone,
    avatar: this.avatar,
    coverImage: this.coverImage,
    bio: this.bio,
    isOnline: this.isOnline,
    lastSeen: this.lastSeen,
    statusText: this.statusText,
    statusEmoji: this.statusEmoji,
    isVerifiedAccount: this.isVerifiedAccount,
    isEmailVerified: this.isEmailVerified,
    isPhoneVerified: this.isPhoneVerified,
    privacy: this.privacy,
    role: this.role,
    createdAt: this.createdAt,
  };
};

const User = mongoose.model("User", userSchema);
module.exports = User;
