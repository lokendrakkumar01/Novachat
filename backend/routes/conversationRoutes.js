// ============================================================
// NovaChat - Conversation Routes
// ============================================================
const express = require("express");
const router = express.Router();
const {
  getOrCreateConversation, getUserConversations,
  archiveConversation, muteConversation, deleteConversation,
} = require("../controllers/conversationController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

router.get("/", getUserConversations);
router.get("/:targetUserId", getOrCreateConversation);
router.patch("/:conversationId/archive", archiveConversation);
router.patch("/:conversationId/mute", muteConversation);
router.delete("/:conversationId", deleteConversation);

module.exports = router;
