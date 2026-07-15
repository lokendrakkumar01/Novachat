// ============================================================
// NovaChat - Notification Routes
// ============================================================
const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const Notification = require("../models/Notification");

router.use(protect);

// Get notifications
router.get("/", async (req, res, next) => {
  try {
    const { page = 1, limit = 30, unread } = req.query;
    const query = { recipient: req.user._id };
    if (unread === "true") query.isRead = false;

    const notifications = await Notification.find(query)
      .populate("sender", "username displayName avatar")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const unreadCount = await Notification.countDocuments({ recipient: req.user._id, isRead: false });
    res.json({ success: true, notifications, unreadCount });
  } catch (error) { next(error); }
});

// Mark as read
router.patch("/:notificationId/read", async (req, res, next) => {
  try {
    await Notification.findByIdAndUpdate(req.params.notificationId, { isRead: true, readAt: new Date() });
    res.json({ success: true });
  } catch (error) { next(error); }
});

// Mark all as read
router.patch("/read-all", async (req, res, next) => {
  try {
    await Notification.updateMany({ recipient: req.user._id, isRead: false }, { isRead: true, readAt: new Date() });
    res.json({ success: true, message: "All notifications marked as read" });
  } catch (error) { next(error); }
});

// Delete notification
router.delete("/:notificationId", async (req, res, next) => {
  try {
    await Notification.findByIdAndDelete(req.params.notificationId);
    res.json({ success: true });
  } catch (error) { next(error); }
});

module.exports = router;
