// ============================================================
// NovaChat - User Controller
// Profile management, contacts, search, privacy
// ============================================================
const User = require("../models/User");
const Conversation = require("../models/Conversation");
const { deleteFromCloudinary } = require("../config/cloudinary");

// Search users
const searchUsers = async (req, res, next) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;
    if (!q || q.trim().length < 1) return res.status(400).json({ success: false, message: "Search query required" });

    const regex = new RegExp(q.trim(), "i");
    const users = await User.find({
      $or: [{ username: regex }, { displayName: regex }, { email: regex }],
      _id: { $ne: req.user._id },
      isBanned: false,
    })
      .select("username displayName avatar isOnline lastSeen isVerifiedAccount statusText")
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    res.json({ success: true, users, total: users.length });
  } catch (error) {
    next(error);
  }
};

// Get user profile by id/username
const getUserProfile = async (req, res, next) => {
  try {
    const { identifier } = req.params;
    const currentUser = req.user;

    const user = await User.findOne({
      $or: [{ _id: identifier.match(/^[0-9a-fA-F]{24}$/) ? identifier : null }, { username: identifier }],
    }).select("-password -refreshToken -emailOTP -phoneOTP -passwordResetToken");

    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const isBlocked = currentUser.blockedUsers.includes(user._id.toString())
      || user.blockedUsers.includes(currentUser._id.toString());

    const profile = user.getPublicProfile();

    // Apply privacy settings
    if (user.privacy.lastSeen === "nobody" || (user.privacy.lastSeen === "contacts" && !user.contacts.includes(currentUser._id))) {
      profile.lastSeen = null;
      profile.isOnline = false;
    }

    res.json({ success: true, user: profile, isBlocked });
  } catch (error) {
    next(error);
  }
};

// Update profile
const updateProfile = async (req, res, next) => {
  try {
    const { displayName, bio, statusText, statusEmoji, username } = req.body;
    const userId = req.user._id;

    if (username) {
      const existingUser = await User.findOne({ username, _id: { $ne: userId } });
      if (existingUser) return res.status(409).json({ success: false, message: "Username already taken" });
    }

    const updates = {};
    if (displayName !== undefined) updates.displayName = displayName;
    if (bio !== undefined) updates.bio = bio;
    if (statusText !== undefined) updates.statusText = statusText;
    if (statusEmoji !== undefined) updates.statusEmoji = statusEmoji;
    if (username !== undefined) updates.username = username;

    const user = await User.findByIdAndUpdate(userId, updates, { new: true, runValidators: true });
    res.json({ success: true, user: user.getPublicProfile() });
  } catch (error) {
    next(error);
  }
};

// Upload avatar
const uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });

    const user = await User.findById(req.user._id);

    // Delete old avatar from Cloudinary
    if (user.avatar?.publicId) {
      await deleteFromCloudinary(user.avatar.publicId);
    }

    user.avatar = { url: req.file.path, publicId: req.file.filename };
    await user.save();

    res.json({ success: true, avatar: user.avatar });
  } catch (error) {
    next(error);
  }
};

// Upload cover image
const uploadCover = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });

    const user = await User.findById(req.user._id);
    if (user.coverImage?.publicId) {
      await deleteFromCloudinary(user.coverImage.publicId);
    }

    user.coverImage = { url: req.file.path, publicId: req.file.filename };
    await user.save();

    res.json({ success: true, coverImage: user.coverImage });
  } catch (error) {
    next(error);
  }
};

// Update privacy settings
const updatePrivacy = async (req, res, next) => {
  try {
    const { privacy } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { privacy },
      { new: true, runValidators: true }
    );
    res.json({ success: true, privacy: user.privacy });
  } catch (error) {
    next(error);
  }
};

// Update notification settings
const updateNotificationSettings = async (req, res, next) => {
  try {
    const { notifications } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { notifications },
      { new: true }
    );
    res.json({ success: true, notifications: user.notifications });
  } catch (error) {
    next(error);
  }
};

// Block user
const blockUser = async (req, res, next) => {
  try {
    const { targetUserId } = req.params;
    const userId = req.user._id;

    await User.findByIdAndUpdate(userId, { $addToSet: { blockedUsers: targetUserId } });
    await User.findByIdAndUpdate(targetUserId, { $addToSet: { blockedBy: userId } });

    res.json({ success: true, message: "User blocked" });
  } catch (error) {
    next(error);
  }
};

// Unblock user
const unblockUser = async (req, res, next) => {
  try {
    const { targetUserId } = req.params;
    const userId = req.user._id;

    await User.findByIdAndUpdate(userId, { $pull: { blockedUsers: targetUserId } });
    await User.findByIdAndUpdate(targetUserId, { $pull: { blockedBy: userId } });

    res.json({ success: true, message: "User unblocked" });
  } catch (error) {
    next(error);
  }
};

// Add contact
const addContact = async (req, res, next) => {
  try {
    const { targetUserId } = req.params;
    await User.findByIdAndUpdate(req.user._id, { $addToSet: { contacts: targetUserId } });
    res.json({ success: true, message: "Contact added" });
  } catch (error) {
    next(error);
  }
};

// Remove contact
const removeContact = async (req, res, next) => {
  try {
    const { targetUserId } = req.params;
    await User.findByIdAndUpdate(req.user._id, { $pull: { contacts: targetUserId } });
    res.json({ success: true, message: "Contact removed" });
  } catch (error) {
    next(error);
  }
};

// Get contacts list
const getContacts = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate(
      "contacts",
      "username displayName avatar isOnline lastSeen statusText isVerifiedAccount"
    );
    res.json({ success: true, contacts: user.contacts });
  } catch (error) {
    next(error);
  }
};

// Update app settings (theme, language, etc.)
const updateSettings = async (req, res, next) => {
  try {
    const { settings } = req.body;
    const user = await User.findByIdAndUpdate(req.user._id, { settings }, { new: true });
    res.json({ success: true, settings: user.settings });
  } catch (error) {
    next(error);
  }
};

// Change password
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select("+password");

    if (!user.password) {
      return res.status(400).json({ success: false, message: "Account uses social login" });
    }

    const isValid = await user.comparePassword(currentPassword);
    if (!isValid) return res.status(401).json({ success: false, message: "Current password is incorrect" });

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: "Password changed successfully" });
  } catch (error) {
    next(error);
  }
};

// Delete account
const deleteAccount = async (req, res, next) => {
  try {
    const { password } = req.body;
    const user = await User.findById(req.user._id).select("+password");

    if (user.password) {
      const isValid = await user.comparePassword(password);
      if (!isValid) return res.status(401).json({ success: false, message: "Invalid password" });
    }

    // Soft delete
    user.isBanned = true;
    user.banReason = "Account deleted by user";
    user.email = `deleted_${user._id}@deleted.novachat`;
    user.username = `deleted_${user._id}`;
    await user.save();

    res.json({ success: true, message: "Account deleted successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  searchUsers, getUserProfile, updateProfile,
  uploadAvatar, uploadCover, updatePrivacy,
  updateNotificationSettings, blockUser, unblockUser,
  addContact, removeContact, getContacts,
  updateSettings, changePassword, deleteAccount,
};
