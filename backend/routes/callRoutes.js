// ============================================================
// NovaChat - Call Routes
// ============================================================
const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const Call = require("../models/Call");

router.use(protect);

// Get call history
router.get("/", async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const calls = await Call.find({
      $or: [{ caller: req.user._id }, { "receivers.user": req.user._id }],
    })
      .populate("caller", "username displayName avatar")
      .populate("receivers.user", "username displayName avatar")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    res.json({ success: true, calls });
  } catch (error) { next(error); }
});

// Get call details
router.get("/:callId", async (req, res, next) => {
  try {
    const call = await Call.findById(req.params.callId)
      .populate("caller", "username displayName avatar")
      .populate("receivers.user", "username displayName avatar");
    if (!call) return res.status(404).json({ success: false, message: "Call not found" });
    res.json({ success: true, call });
  } catch (error) { next(error); }
});

module.exports = router;
