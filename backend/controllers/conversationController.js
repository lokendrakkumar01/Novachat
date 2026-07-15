// ============================================================
// NovaChat - Conversation Controller
// ============================================================
const Conversation = require("../models/Conversation");
const User = require("../models/User");
const Message = require("../models/Message");

// Get or create a private conversation
const getOrCreateConversation = async (req, res, next) => {
  try {
    const { targetUserId } = req.params;
    const userId = req.user._id;

    if (userId.toString() === targetUserId) {
      return res.status(400).json({ success: false, message: "Cannot start conversation with yourself" });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) return res.status(404).json({ success: false, message: "User not found" });

    // Check if blocked
    if (req.user.blockedUsers.includes(targetUserId)) {
      return res.status(403).json({ success: false, message: "You have blocked this user" });
    }

    // Find existing conversation
    let conversation = await Conversation.findOne({
      participants: { $all: [userId, targetUserId], $size: 2 },
    })
      .populate("participants", "username displayName avatar isOnline lastSeen")
      .populate("lastMessage");

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [userId, targetUserId],
        unreadCount: [
          { user: userId, count: 0 },
          { user: targetUserId, count: 0 },
        ],
      });
      await conversation.populate("participants", "username displayName avatar isOnline lastSeen");
    }

    res.json({ success: true, conversation });
  } catch (error) {
    next(error);
  }
};

// Get all conversations for current user
const getUserConversations = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 20 } = req.query;

    const conversations = await Conversation.find({
      participants: userId,
      "deletedFor.user": { $ne: userId },
      "archivedBy": { $ne: userId },
      isActive: true,
    })
      .populate("participants", "username displayName avatar isOnline lastSeen statusText")
      .populate({
        path: "lastMessage",
        populate: { path: "sender", select: "username displayName" },
      })
      .sort({ updatedAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    res.json({ success: true, conversations });
  } catch (error) {
    next(error);
  }
};

// Archive conversation
const archiveConversation = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;
    const conversation = await Conversation.findByIdAndUpdate(conversationId, {
      $addToSet: { archivedBy: userId },
    }, { new: true });
    res.json({ success: true, message: "Conversation archived", conversation });
  } catch (error) {
    next(error);
  }
};

// Mute conversation
const muteConversation = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { duration } = req.body; // duration in hours, 0 = forever
    const userId = req.user._id;

    const mutedUntil = duration ? new Date(Date.now() + duration * 60 * 60 * 1000) : null;

    await Conversation.findByIdAndUpdate(conversationId, {
      $pull: { mutedBy: { user: userId } },
    });
    await Conversation.findByIdAndUpdate(conversationId, {
      $push: { mutedBy: { user: userId, until: mutedUntil } },
    });

    res.json({ success: true, message: "Conversation muted" });
  } catch (error) {
    next(error);
  }
};

// Delete conversation (for me)
const deleteConversation = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    await Conversation.findByIdAndUpdate(conversationId, {
      $addToSet: { deletedFor: { user: userId } },
    });
    // Also delete all messages for this user
    await Message.updateMany(
      { conversation: conversationId },
      { $addToSet: { deletedFor: userId } }
    );

    res.json({ success: true, message: "Conversation deleted" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOrCreateConversation,
  getUserConversations,
  archiveConversation,
  muteConversation,
  deleteConversation,
};
