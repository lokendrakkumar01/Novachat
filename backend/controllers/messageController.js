// ============================================================
// NovaChat - Message Controller
// Real-time messaging backend logic
// ============================================================
const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const Group = require("../models/Group");
const User = require("../models/User");
const Notification = require("../models/Notification");

// ============================================================
// @desc   Send a message in a private conversation
// @route  POST /api/messages/private/:conversationId
// @access Private
// ============================================================
const sendPrivateMessage = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { content, type = "text", replyTo } = req.body;
    const senderId = req.user._id;

    // Get conversation and verify sender is participant
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }
    if (!conversation.participants.includes(senderId.toString())) {
      return res.status(403).json({ success: false, message: "Not a participant of this conversation" });
    }

    // Determine type dynamically if file is present
    let messageType = type;
    if (req.file) {
      if (req.file.mimetype.startsWith("image/")) {
        messageType = "image";
      } else if (req.file.mimetype.startsWith("video/")) {
        messageType = "video";
      } else if (req.file.mimetype.startsWith("audio/")) {
        messageType = "audio";
      } else {
        messageType = "document";
      }
    }

    // Create message data
    const messageData = {
      sender: senderId,
      conversationType: "private",
      conversation: conversationId,
      type: messageType,
      content: content || "",
      replyTo: replyTo || null,
    };

    // Handle media from upload
    if (req.file) {
      messageData.media = {
        url: req.file.path,
        publicId: req.file.filename,
        type: req.file.mimetype,
        name: req.file.originalname,
        size: req.file.size,
      };
    }

    const message = await Message.create(messageData);
    await message.populate("sender", "username displayName avatar isOnline");
    if (replyTo) await message.populate("replyTo");

    // Update conversation
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: message._id,
      updatedAt: new Date(),
      $inc: {
        "unreadCount.$[elem].count": 1,
      },
    }, {
      arrayFilters: [{ "elem.user": { $ne: senderId } }],
    });

    // Update sender stats
    await User.findByIdAndUpdate(senderId, { $inc: { totalMessages: 1 } });

    // Emit via socket (handled in socket layer, but return message for REST)
    const io = req.app.get("io");
    const otherParticipant = conversation.participants.find(
      (p) => p.toString() !== senderId.toString()
    );

    if (io) {
      io.to(`user_${otherParticipant}`).emit("message:receive", {
        message,
        conversationId,
      });

      // Create notification (wrapped in try-catch to prevent block failures)
      try {
        const recipientUser = await User.findById(otherParticipant);
        if (recipientUser && recipientUser.notifications?.messages) {
          await Notification.create({
            recipient: otherParticipant,
            sender: senderId,
            type: "message",
            title: req.user.displayName || req.user.username,
            body: messageType === "text" ? (content || "New message") : `Sent an attachment`,
            reference: { model: "Message", id: message._id },
          });
          io.to(`user_${otherParticipant}`).emit("notification:new", {
            type: "message",
            from: req.user.getPublicProfile(),
          });
        }
      } catch (notifError) {
        console.warn("⚠️ Notification failed to create, skipping:", notifError.message);
      }
    }

    res.status(201).json({ success: true, message });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// @desc   Get messages for a conversation
// @route  GET /api/messages/private/:conversationId
// @access Private
// ============================================================
const getPrivateMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50, before } = req.query;
    const userId = req.user._id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return res.status(404).json({ success: false, message: "Conversation not found" });
    if (!conversation.participants.includes(userId.toString())) {
      return res.status(403).json({ success: false, message: "Not a participant" });
    }

    const query = {
      conversation: conversationId,
      isDeleted: false,
      deletedFor: { $ne: userId },
    };

    if (before) query.createdAt = { $lt: new Date(before) };

    const messages = await Message.find(query)
      .populate("sender", "username displayName avatar")
      .populate("replyTo", "content sender type media")
      .populate("reactions.user", "username displayName avatar")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    // Mark as read
    const unreadMessageIds = messages
      .filter((m) => m.sender._id.toString() !== userId.toString())
      .filter((m) => !m.readBy.some((r) => r.user.toString() === userId.toString()))
      .map((m) => m._id);

    if (unreadMessageIds.length > 0) {
      await Message.updateMany(
        { _id: { $in: unreadMessageIds } },
        { $addToSet: { readBy: { user: userId, at: new Date() } } }
      );

      // Reset unread count
      await Conversation.findByIdAndUpdate(conversationId, {
        $set: { "unreadCount.$[elem].count": 0 },
      }, {
        arrayFilters: [{ "elem.user": userId }],
      });
    }

    res.json({
      success: true,
      messages: messages.reverse(), // oldest first
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: messages.length === parseInt(limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// @desc   Send group message
// @route  POST /api/messages/group/:groupId
// @access Private
// ============================================================
const sendGroupMessage = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { content, type = "text", replyTo, mentions } = req.body;
    const senderId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ success: false, message: "Group not found" });

    const memberEntry = group.members.find((m) => m.user.toString() === senderId.toString());
    if (!memberEntry) return res.status(403).json({ success: false, message: "Not a group member" });

    if (group.settings.onlyAdminsCanMessage && memberEntry.role === "member") {
      return res.status(403).json({ success: false, message: "Only admins can send messages in this group" });
    }

    let messageType = type;
    if (req.file) {
      if (req.file.mimetype.startsWith("image/")) {
        messageType = "image";
      } else if (req.file.mimetype.startsWith("video/")) {
        messageType = "video";
      } else if (req.file.mimetype.startsWith("audio/")) {
        messageType = "audio";
      } else {
        messageType = "document";
      }
    }

    const messageData = {
      sender: senderId,
      conversationType: "group",
      group: groupId,
      type: messageType,
      content: content || "",
      replyTo: replyTo || null,
      mentions: mentions || [],
    };

    if (req.file) {
      messageData.media = {
        url: req.file.path,
        publicId: req.file.filename,
        type: req.file.mimetype,
        name: req.file.originalname,
        size: req.file.size,
      };
    }

    const message = await Message.create(messageData);
    await message.populate("sender", "username displayName avatar");
    if (replyTo) await message.populate("replyTo");

    // Update group's last message
    await Group.findByIdAndUpdate(groupId, {
      lastMessage: message._id,
      $inc: { totalMessages: 1 },
    });

    // Emit to group room via socket
    const io = req.app.get("io");
    if (io) {
      io.to(`group_${groupId}`).emit("message:receive", { message, groupId });
    }

    res.status(201).json({ success: true, message });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// @desc   Edit a message
// @route  PATCH /api/messages/:messageId/edit
// @access Private
// ============================================================
const editMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ success: false, message: "Message not found" });
    if (message.sender.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Cannot edit another user's message" });
    }
    if (message.isDeleted) return res.status(400).json({ success: false, message: "Cannot edit a deleted message" });

    // Store edit history
    message.editHistory.push({ content: message.content, editedAt: new Date() });
    message.content = content;
    message.isEdited = true;
    await message.save();

    // Emit edit event
    const io = req.app.get("io");
    if (io) {
      const room = message.conversationType === "group"
        ? `group_${message.group}`
        : `conversation_${message.conversation}`;
      io.to(room).emit("message:edited", { messageId, content, editedAt: new Date() });
    }

    res.json({ success: true, message });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// @desc   Delete a message
// @route  DELETE /api/messages/:messageId
// @access Private
// ============================================================
const deleteMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { forEveryone = false } = req.body;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ success: false, message: "Message not found" });

    if (forEveryone) {
      if (message.sender.toString() !== userId.toString()) {
        return res.status(403).json({ success: false, message: "Cannot delete another user's message for everyone" });
      }
      message.isDeleted = true;
      message.deletedForEveryone = true;
      message.content = "";
      message.media = {};
      message.deletedAt = new Date();
    } else {
      message.deletedFor.addToSet(userId);
    }

    await message.save();

    // Emit delete event
    const io = req.app.get("io");
    if (io) {
      const room = message.conversationType === "group"
        ? `group_${message.group}`
        : `conversation_${message.conversation}`;
      io.to(room).emit("message:deleted", { messageId, forEveryone });
    }

    res.json({ success: true, message: "Message deleted" });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// @desc   React to a message
// @route  POST /api/messages/:messageId/react
// @access Private
// ============================================================
const reactToMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ success: false, message: "Message not found" });

    // Remove existing reaction from user
    message.reactions = message.reactions.filter(
      (r) => r.user.toString() !== userId.toString()
    );

    // Add new reaction (if emoji provided)
    if (emoji) {
      message.reactions.push({ user: userId, emoji, createdAt: new Date() });
    }

    await message.save();
    await message.populate("reactions.user", "username displayName avatar");

    // Emit reaction event
    const io = req.app.get("io");
    if (io) {
      const room = message.conversationType === "group"
        ? `group_${message.group}`
        : `conversation_${message.conversation}`;
      io.to(room).emit("message:reaction", { messageId, reactions: message.reactions });
    }

    res.json({ success: true, reactions: message.reactions });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// @desc   Pin/Unpin a message
// @route  PATCH /api/messages/:messageId/pin
// @access Private
// ============================================================
const pinMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ success: false, message: "Message not found" });

    message.isPinned = !message.isPinned;
    message.pinnedBy = message.isPinned ? userId : null;
    message.pinnedAt = message.isPinned ? new Date() : null;
    await message.save();

    res.json({ success: true, isPinned: message.isPinned, message: `Message ${message.isPinned ? "pinned" : "unpinned"}` });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// @desc   Search messages
// @route  GET /api/messages/search
// @access Private
// ============================================================
const searchMessages = async (req, res, next) => {
  try {
    const { q, conversationId, groupId, limit = 20 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ success: false, message: "Search query must be at least 2 characters" });
    }

    const query = {
      $text: { $search: q },
      isDeleted: false,
      deletedForEveryone: false,
    };

    if (conversationId) query.conversation = conversationId;
    if (groupId) query.group = groupId;

    const messages = await Message.find(query)
      .populate("sender", "username displayName avatar")
      .sort({ score: { $meta: "textScore" }, createdAt: -1 })
      .limit(parseInt(limit));

    res.json({ success: true, messages, total: messages.length });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// @desc   Forward a message
// @route  POST /api/messages/:messageId/forward
// @access Private
// ============================================================
const forwardMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { targets } = req.body; // array of { type: 'conversation'|'group', id }
    const senderId = req.user._id;

    const originalMessage = await Message.findById(messageId);
    if (!originalMessage) return res.status(404).json({ success: false, message: "Message not found" });

    const forwardedMessages = [];
    const io = req.app.get("io");

    for (const target of targets) {
      const messageData = {
        sender: senderId,
        conversationType: target.type === "group" ? "group" : "private",
        [target.type]: target.id,
        type: originalMessage.type,
        content: originalMessage.content,
        media: originalMessage.media,
        isForwarded: true,
        forwardedFrom: originalMessage._id,
      };

      const msg = await Message.create(messageData);
      await msg.populate("sender", "username displayName avatar");
      forwardedMessages.push(msg);

      if (io) {
        if (target.type === "group") {
          io.to(`group_${target.id}`).emit("message:receive", { message: msg, groupId: target.id });
        } else {
          io.to(`conversation_${target.id}`).emit("message:receive", { message: msg, conversationId: target.id });
        }
      }
    }

    res.status(201).json({ success: true, messages: forwardedMessages });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// @desc   Star/Unstar a message
// @route  PATCH /api/messages/:messageId/star
// @access Private
// ============================================================
const starMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ success: false, message: "Message not found" });

    const isStarred = message.starredBy.includes(userId);
    if (isStarred) {
      message.starredBy = message.starredBy.filter((id) => id.toString() !== userId.toString());
    } else {
      message.starredBy.push(userId);
    }

    await message.save();
    res.json({ success: true, isStarred: !isStarred });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  sendPrivateMessage,
  getPrivateMessages,
  sendGroupMessage,
  editMessage,
  deleteMessage,
  reactToMessage,
  pinMessage,
  searchMessages,
  forwardMessage,
  starMessage,
};
