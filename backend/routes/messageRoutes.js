// ============================================================
// NovaChat - Message Routes
// ============================================================
const express = require("express");
const router = express.Router();
const {
  sendPrivateMessage, getPrivateMessages, sendGroupMessage,
  editMessage, deleteMessage, reactToMessage, pinMessage,
  searchMessages, forwardMessage, starMessage,
} = require("../controllers/messageController");
const { protect } = require("../middleware/authMiddleware");
const { uploadChatMedia } = require("../middleware/uploadMiddleware");

// All routes protected
router.use(protect);

// Private messages
router.route("/private/:conversationId")
  .get(getPrivateMessages)
  .post(uploadChatMedia, sendPrivateMessage);

// Group messages
router.post("/group/:groupId", uploadChatMedia, sendGroupMessage);

// Message actions
router.get("/search", searchMessages);
router.post("/:messageId/forward", forwardMessage);
router.patch("/:messageId/edit", editMessage);
router.delete("/:messageId", deleteMessage);
router.post("/:messageId/react", reactToMessage);
router.patch("/:messageId/pin", pinMessage);
router.patch("/:messageId/star", starMessage);

module.exports = router;
