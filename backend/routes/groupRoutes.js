// ============================================================
// NovaChat - Group Routes
// ============================================================
const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { uploadGroupAvatar } = require("../middleware/uploadMiddleware");
const Group = require("../models/Group");
const { v4: uuidv4 } = require("uuid");

router.use(protect);

// Create group
router.post("/", uploadGroupAvatar, async (req, res, next) => {
  try {
    const { name, description, memberIds } = req.body;
    const parsedMembers = typeof memberIds === "string" ? JSON.parse(memberIds) : memberIds;

    const members = [
      { user: req.user._id, role: "owner", joinedAt: new Date() },
      ...(parsedMembers || []).map((id) => ({ user: id, role: "member", joinedAt: new Date() })),
    ];

    const groupData = {
      name, description, createdBy: req.user._id, members,
      inviteLink: uuidv4(),
    };

    if (req.file) {
      groupData.avatar = { url: req.file.path, publicId: req.file.filename };
    }

    const group = await Group.create(groupData);
    await group.populate("members.user", "username displayName avatar");
    res.status(201).json({ success: true, group });
  } catch (error) {
    next(error);
  }
});

// Get user's groups
router.get("/", async (req, res, next) => {
  try {
    const groups = await Group.find({
      "members.user": req.user._id,
      isActive: true,
    })
      .populate("lastMessage")
      .populate("members.user", "username displayName avatar isOnline")
      .sort({ updatedAt: -1 });
    res.json({ success: true, groups });
  } catch (error) {
    next(error);
  }
});

// Get group details
router.get("/:groupId", async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.groupId)
      .populate("members.user", "username displayName avatar isOnline lastSeen")
      .populate("lastMessage");
    if (!group) return res.status(404).json({ success: false, message: "Group not found" });
    res.json({ success: true, group });
  } catch (error) {
    next(error);
  }
});

// Get group messages
router.get("/:groupId/messages", async (req, res, next) => {
  try {
    const Message = require("../models/Message");
    const { page = 1, limit = 50 } = req.query;
    const messages = await Message.find({
      group: req.params.groupId,
      isDeleted: false,
    })
      .populate("sender", "username displayName avatar")
      .populate("replyTo")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    res.json({ success: true, messages: messages.reverse() });
  } catch (error) {
    next(error);
  }
});

// Add members
router.post("/:groupId/members", async (req, res, next) => {
  try {
    const { userIds } = req.body;
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ success: false, message: "Group not found" });

    const requester = group.members.find((m) => m.user.toString() === req.user._id.toString());
    if (!requester || requester.role === "member") {
      return res.status(403).json({ success: false, message: "Only admins can add members" });
    }

    const newMembers = userIds.map((id) => ({ user: id, role: "member", joinedAt: new Date(), addedBy: req.user._id }));
    group.members.push(...newMembers);
    await group.save();

    res.json({ success: true, message: "Members added" });
  } catch (error) {
    next(error);
  }
});

// Leave group
router.post("/:groupId/leave", async (req, res, next) => {
  try {
    await Group.findByIdAndUpdate(req.params.groupId, {
      $pull: { members: { user: req.user._id } },
    });
    res.json({ success: true, message: "Left group" });
  } catch (error) {
    next(error);
  }
});

// Update group info
router.put("/:groupId", uploadGroupAvatar, async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (description) updates.description = description;
    if (req.file) updates.avatar = { url: req.file.path, publicId: req.file.filename };

    const group = await Group.findByIdAndUpdate(req.params.groupId, updates, { new: true });
    res.json({ success: true, group });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
