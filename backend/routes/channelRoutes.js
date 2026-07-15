// ============================================================
// NovaChat - Channel, Call, Notification, AI, Upload Routes
// ============================================================
const express = require("express");

// --- Channel Routes ---
const channelRouter = express.Router();
const Channel = require("../models/Channel");
const { protect } = require("../middleware/authMiddleware");
const { uploadGroupAvatar } = require("../middleware/uploadMiddleware");

channelRouter.use(protect);
channelRouter.post("/", uploadGroupAvatar, async (req, res, next) => {
  try {
    const { name, handle, description, isPublic, category } = req.body;
    const channelData = { name, handle, description, isPublic, category, owner: req.user._id, admins: [req.user._id] };
    if (req.file) channelData.avatar = { url: req.file.path, publicId: req.file.filename };
    const { v4: uuidv4 } = require("uuid");
    channelData.inviteLink = uuidv4();
    const channel = await Channel.create(channelData);
    res.status(201).json({ success: true, channel });
  } catch (error) { next(error); }
});

channelRouter.get("/", async (req, res, next) => {
  try {
    const channels = await Channel.find({ "subscribers.user": req.user._id, isActive: true })
      .populate("owner", "username displayName avatar")
      .sort({ updatedAt: -1 });
    res.json({ success: true, channels });
  } catch (error) { next(error); }
});

channelRouter.get("/:channelId", async (req, res, next) => {
  try {
    const channel = await Channel.findById(req.params.channelId)
      .populate("owner", "username displayName avatar isVerifiedAccount");
    if (!channel) return res.status(404).json({ success: false, message: "Channel not found" });
    res.json({ success: true, channel });
  } catch (error) { next(error); }
});

channelRouter.post("/:channelId/subscribe", async (req, res, next) => {
  try {
    await Channel.findByIdAndUpdate(req.params.channelId, {
      $addToSet: { subscribers: { user: req.user._id } },
    });
    res.json({ success: true, message: "Subscribed" });
  } catch (error) { next(error); }
});

channelRouter.delete("/:channelId/unsubscribe", async (req, res, next) => {
  try {
    await Channel.findByIdAndUpdate(req.params.channelId, {
      $pull: { subscribers: { user: req.user._id } },
    });
    res.json({ success: true, message: "Unsubscribed" });
  } catch (error) { next(error); }
});

module.exports = { channelRouter };
