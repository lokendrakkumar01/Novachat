// ============================================================
// NovaChat - User Routes
// ============================================================
const express = require("express");
const router = express.Router();
const {
  searchUsers, getUserProfile, updateProfile,
  uploadAvatar, uploadCover, updatePrivacy,
  updateNotificationSettings, blockUser, unblockUser,
  addContact, removeContact, getContacts,
  updateSettings, changePassword, deleteAccount,
} = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");
const { uploadProfileAvatar, uploadCoverImage } = require("../middleware/uploadMiddleware");

router.use(protect);

router.get("/search", searchUsers);
router.get("/contacts", getContacts);
router.get("/:identifier", getUserProfile);
router.put("/profile", updateProfile);
router.post("/avatar", uploadProfileAvatar, uploadAvatar);
router.post("/cover", uploadCoverImage, uploadCover);
router.put("/privacy", updatePrivacy);
router.put("/notifications", updateNotificationSettings);
router.put("/settings", updateSettings);
router.put("/change-password", changePassword);
router.delete("/account", deleteAccount);
router.post("/block/:targetUserId", blockUser);
router.delete("/block/:targetUserId", unblockUser);
router.post("/contacts/:targetUserId", addContact);
router.delete("/contacts/:targetUserId", removeContact);

module.exports = router;
