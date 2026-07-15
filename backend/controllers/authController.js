// ============================================================
// NovaChat - Auth Controller
// Handles: Register, Login, Logout, OTP, Google OAuth, etc.
// ============================================================
const User = require("../models/User");
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  setTokenCookies,
  clearTokenCookies,
  generateOTP,
  generateResetToken,
} = require("../utils/jwt");
const { sendEmailOTP, sendPasswordResetEmail, sendWelcomeEmail } = require("../services/emailService");
const { sendPhoneOTP } = require("../services/smsService");

// ============================================================
// @desc   Register new user
// @route  POST /api/auth/register
// @access Public
// ============================================================
const register = async (req, res, next) => {
  try {
    const { username, email, password, displayName, phone } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }, ...(phone ? [{ phone }] : [])],
    });

    if (existingUser) {
      let field = "Email";
      if (existingUser.username === username) field = "Username";
      if (phone && existingUser.phone === phone) field = "Phone number";
      return res.status(409).json({ success: false, message: `${field} already registered` });
    }

    // Generate email OTP
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create user (not yet verified)
    const user = await User.create({
      username,
      email,
      password,
      displayName: displayName || username,
      phone,
      emailOTP: otp,
      emailOTPExpiry: otpExpiry,
    });

    // Send verification email
    try {
      await sendEmailOTP(email, otp, displayName || username);
    } catch (emailError) {
      console.error("Email send error:", emailError.message);
      // Don't fail registration if email fails
    }

    res.status(201).json({
      success: true,
      message: "Registration successful! Please verify your email with the OTP sent.",
      userId: user._id,
      email: user.email,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// @desc   Verify email OTP
// @route  POST /api/auth/verify-email
// @access Public
// ============================================================
const verifyEmail = async (req, res, next) => {
  try {
    const { userId, otp } = req.body;

    const user = await User.findById(userId).select("+emailOTP +emailOTPExpiry");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ success: false, message: "Email already verified" });
    }

    if (!user.emailOTP || user.emailOTP !== otp) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    if (user.emailOTPExpiry < new Date()) {
      return res.status(400).json({ success: false, message: "OTP expired. Please request a new one." });
    }

    // Verify the user
    user.isEmailVerified = true;
    user.emailOTP = undefined;
    user.emailOTPExpiry = undefined;
    await user.save();

    // Send welcome email
    try {
      await sendWelcomeEmail(user.email, user.displayName);
    } catch {}

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    user.refreshToken = refreshToken;
    await user.save();

    setTokenCookies(res, accessToken, refreshToken);

    res.json({
      success: true,
      message: "Email verified successfully! Welcome to NovaChat!",
      user: user.getPublicProfile(),
      accessToken,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// @desc   Resend email OTP
// @route  POST /api/auth/resend-otp
// @access Public
// ============================================================
const resendOTP = async (req, res, next) => {
  try {
    const { userId, type } = req.body; // type: 'email' | 'phone'

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const otp = generateOTP();
    const expiry = new Date(Date.now() + 10 * 60 * 1000);

    if (type === "phone") {
      user.phoneOTP = otp;
      user.phoneOTPExpiry = expiry;
      await user.save();
      try {
        await sendPhoneOTP(user.phone, otp);
      } catch (smsError) {
        console.log(`⚠️ SMS Service Offline. Fallback to Email. OTP: ${otp}`);
        const { sendPhoneOTPEmail } = require("../services/emailService");
        await sendPhoneOTPEmail(user.email, otp, user.displayName);
      }
    } else {
      user.emailOTP = otp;
      user.emailOTPExpiry = expiry;
      await user.save();
      await sendEmailOTP(user.email, otp, user.displayName);
    }

    res.json({ success: true, message: `OTP resent to your ${type}` });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// @desc   Login with email/username + password
// @route  POST /api/auth/login
// @access Public
// ============================================================
const login = async (req, res, next) => {
  try {
    const { identifier, password } = req.body; // identifier = email or username

    // Find user by email or username
    const user = await User.findOne({
      $or: [{ email: identifier.toLowerCase() }, { username: identifier }],
    }).select("+password +refreshToken");

    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    if (!user.password) {
      return res.status(401).json({
        success: false,
        message: "This account uses Google login. Please sign in with Google.",
      });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    if (user.isBanned) {
      return res.status(403).json({
        success: false,
        message: "Your account has been banned",
        banReason: user.banReason,
      });
    }

    if (!user.isEmailVerified) {
      // Resend OTP
      const otp = generateOTP();
      user.emailOTP = otp;
      user.emailOTPExpiry = new Date(Date.now() + 10 * 60 * 1000);
      await user.save();
      try {
        await sendEmailOTP(user.email, otp, user.displayName);
      } catch {}

      return res.status(403).json({
        success: false,
        message: "Email not verified. A new OTP has been sent.",
        userId: user._id,
        requiresVerification: true,
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Update user
    user.refreshToken = refreshToken;
    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();

    setTokenCookies(res, accessToken, refreshToken);

    res.json({
      success: true,
      message: "Login successful",
      user: user.getPublicProfile(),
      accessToken,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// @desc   Logout
// @route  POST /api/auth/logout
// @access Private
// ============================================================
const logout = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("+refreshToken");
    if (user) {
      user.refreshToken = undefined;
      user.isOnline = false;
      user.lastSeen = new Date();
      await user.save();
    }

    clearTokenCookies(res);

    res.json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// @desc   Refresh access token
// @route  POST /api/auth/refresh-token
// @access Public (with refresh token)
// ============================================================
const refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!token) {
      return res.status(401).json({ success: false, message: "No refresh token provided" });
    }

    const decoded = verifyRefreshToken(token);
    const user = await User.findById(decoded.id).select("+refreshToken");

    if (!user || user.refreshToken !== token) {
      return res.status(401).json({ success: false, message: "Invalid refresh token" });
    }

    const newAccessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    user.refreshToken = newRefreshToken;
    await user.save();

    setTokenCookies(res, newAccessToken, newRefreshToken);

    res.json({
      success: true,
      accessToken: newAccessToken,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// @desc   Forgot Password - send reset email
// @route  POST /api/auth/forgot-password
// @access Public
// ============================================================
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Don't reveal if email exists
      return res.json({ success: true, message: "If this email exists, a reset link has been sent." });
    }

    const resetToken = generateResetToken();
    user.passwordResetToken = resetToken;
    user.passwordResetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    try {
      await sendPasswordResetEmail(user.email, resetToken, user.displayName);
    } catch (err) {
      user.passwordResetToken = undefined;
      user.passwordResetExpiry = undefined;
      await user.save();
      return next(new Error("Email could not be sent. Please try again."));
    }

    res.json({ success: true, message: "Password reset link sent to your email." });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// @desc   Reset Password with token
// @route  POST /api/auth/reset-password
// @access Public
// ============================================================
const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpiry: { $gt: new Date() },
    }).select("+passwordResetToken +passwordResetExpiry");

    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid or expired reset token" });
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpiry = undefined;
    user.refreshToken = undefined;
    await user.save();

    clearTokenCookies(res);

    res.json({ success: true, message: "Password reset successful. Please login with your new password." });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// @desc   Send Phone OTP
// @route  POST /api/auth/send-phone-otp
// @access Private
// ============================================================
const sendPhoneOTPHandler = async (req, res, next) => {
  try {
    const { phone } = req.body;
    const otp = generateOTP();
    const expiry = new Date(Date.now() + 10 * 60 * 1000);

    await User.findByIdAndUpdate(req.user._id, {
      phone,
      phoneOTP: otp,
      phoneOTPExpiry: expiry,
    });

    let method = "Phone (SMS)";
    try {
      await sendPhoneOTP(phone, otp);
    } catch (smsError) {
      console.log(`⚠️ SMS Service Offline. Fallback to Email. OTP: ${otp}`);
      const { sendPhoneOTPEmail } = require("../services/emailService");
      await sendPhoneOTPEmail(req.user.email, otp, req.user.displayName);
      method = "Email (Fallback)";
    }

    res.json({ success: true, message: `OTP sent to your ${method}` });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// @desc   Verify Phone OTP
// @route  POST /api/auth/verify-phone
// @access Private
// ============================================================
const verifyPhone = async (req, res, next) => {
  try {
    const { otp } = req.body;

    const user = await User.findById(req.user._id).select("+phoneOTP +phoneOTPExpiry");
    if (!user.phoneOTP || user.phoneOTP !== otp) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }
    if (user.phoneOTPExpiry < new Date()) {
      return res.status(400).json({ success: false, message: "OTP expired" });
    }

    user.isPhoneVerified = true;
    user.phoneOTP = undefined;
    user.phoneOTPExpiry = undefined;
    await user.save();

    res.json({ success: true, message: "Phone number verified successfully" });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// @desc   Get current user (me)
// @route  GET /api/auth/me
// @access Private
// ============================================================
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("-refreshToken -emailOTP -phoneOTP -passwordResetToken");
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// @desc   Google OAuth Callback
// @route  GET /api/auth/google/callback
// @access Public (passport handles)
// ============================================================
const googleAuthCallback = async (req, res, next) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.redirect(`${process.env.CLIENT_URL}/login?error=no_code`);
    }

    const axios = require("axios");

    // 1. Exchange authorization code for access token
    const tokenResponse = await axios.post("https://oauth2.googleapis.com/token", {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_CALLBACK_URL,
      grant_type: "authorization_code",
    });

    const { access_token } = tokenResponse.data;

    // 2. Get user info using access token
    const userResponse = await axios.get("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const profile = userResponse.data;
    const email = profile.email;
    const displayName = profile.name || profile.given_name;
    const avatarUrl = profile.picture;

    // 3. Find or create user
    let user = await User.findOne({ email });

    if (!user) {
      // Generate a unique username
      let username = email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "");
      const usernameExists = await User.findOne({ username });
      if (usernameExists) {
        username = `${username}_${Math.floor(Math.random() * 1000)}`;
      }

      user = await User.create({
        username,
        email,
        displayName,
        avatar: { url: avatarUrl, publicId: "" },
        isEmailVerified: true,
      });
    }

    // 4. Generate JWT tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshToken = refreshToken;
    await user.save();

    setTokenCookies(res, accessToken, refreshToken);

    // 5. Redirect to frontend success page
    res.redirect(`${process.env.CLIENT_URL}/auth/google/success?token=${accessToken}`);
  } catch (error) {
    console.error("Google auth callback error:", error.message);
    res.redirect(`${process.env.CLIENT_URL}/login?error=oauth_failed`);
  }
};

module.exports = {
  register,
  verifyEmail,
  resendOTP,
  login,
  logout,
  refreshToken,
  forgotPassword,
  resetPassword,
  sendPhoneOTPHandler,
  verifyPhone,
  getMe,
  googleAuthCallback,
};
