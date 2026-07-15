// ============================================================
// NovaChat - Upload Routes (general file uploads)
// ============================================================
const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { uploadChatMedia, uploadMultipleMedia } = require("../middleware/uploadMiddleware");
const Report = require("../models/Report");

router.use(protect);

// Upload single media file
router.post("/media", uploadChatMedia, async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });
    res.json({
      success: true,
      file: {
        url: req.file.path,
        publicId: req.file.filename,
        type: req.file.mimetype,
        name: req.file.originalname,
        size: req.file.size,
      },
    });
  } catch (error) { next(error); }
});

// Upload multiple media files
router.post("/media/multiple", uploadMultipleMedia, async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) return res.status(400).json({ success: false, message: "No files uploaded" });
    const files = req.files.map((f) => ({
      url: f.path,
      publicId: f.filename,
      type: f.mimetype,
      name: f.originalname,
      size: f.size,
    }));
    res.json({ success: true, files });
  } catch (error) { next(error); }
});

// Submit report
router.post("/report", async (req, res, next) => {
  try {
    const { type, description, reportedUser, reportedMessage, reportedStory } = req.body;
    const report = await Report.create({
      reporter: req.user._id,
      type, description, reportedUser, reportedMessage, reportedStory,
    });
    res.status(201).json({ success: true, message: "Report submitted", report });
  } catch (error) { next(error); }
});

module.exports = router;
