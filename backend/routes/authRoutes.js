// ============================================================
// NovaChat - All API Routes
// ============================================================
const express = require("express");
const router = express.Router();
const {
  register, verifyEmail, resendOTP, login, logout,
  refreshToken, forgotPassword, resetPassword,
  sendPhoneOTPHandler, verifyPhone, getMe, googleAuthCallback,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

// Public routes
router.post("/register", register);
router.post("/verify-email", verifyEmail);
router.post("/resend-otp", resendOTP);
router.post("/login", login);
router.post("/refresh-token", refreshToken);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// Protected routes
router.post("/logout", protect, logout);
router.get("/me", protect, getMe);
router.post("/send-phone-otp", protect, sendPhoneOTPHandler);
router.post("/verify-phone", protect, verifyPhone);

// Google OAuth
router.get("/google", (req, res) => {
  const redirectUri = process.env.GOOGLE_CALLBACK_URL;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=profile%20email`;
  res.redirect(url);
});

router.get("/google/callback", googleAuthCallback);

module.exports = router;
