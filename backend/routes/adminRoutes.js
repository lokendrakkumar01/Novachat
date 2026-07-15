// ============================================================
// NovaChat - Admin Routes
// ============================================================
const express = require("express");
const router = express.Router();
const {
  getDashboardStats, getAllUsers, toggleBanUser, verifyUser,
  deleteUser, getReports, resolveReport, broadcastNotification,
} = require("../controllers/adminController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

router.use(protect, adminOnly);

router.get("/dashboard", getDashboardStats);
router.get("/users", getAllUsers);
router.patch("/users/:userId/ban", toggleBanUser);
router.patch("/users/:userId/verify", verifyUser);
router.delete("/users/:userId", deleteUser);
router.get("/reports", getReports);
router.patch("/reports/:reportId", resolveReport);
router.post("/broadcast", broadcastNotification);

module.exports = router;
