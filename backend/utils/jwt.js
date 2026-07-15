// ============================================================
// NovaChat - JWT Utility Functions
// ============================================================
const jwt = require("jsonwebtoken");

/**
 * Generate JWT access token (short-lived: 15min)
 */
const generateAccessToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRE || "15m",
  });
};

/**
 * Generate JWT refresh token (long-lived: 7d)
 */
const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: "36500d", // 100 years
  });
};

/**
 * Verify access token
 */
const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
};

/**
 * Verify refresh token
 */
const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
};

/**
 * Set tokens in HTTP-only cookies
 */
const setTokenCookies = (res, accessToken, refreshToken) => {
  const isProduction = process.env.NODE_ENV === "production";

  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 100 * 365 * 24 * 60 * 60 * 1000, // 100 years
  });
};

/**
 * Clear token cookies on logout
 */
const clearTokenCookies = (res) => {
  const isProduction = process.env.NODE_ENV === "production";
  res.clearCookie("accessToken", { httpOnly: true, secure: isProduction, sameSite: isProduction ? "none" : "lax" });
  res.clearCookie("refreshToken", { httpOnly: true, secure: isProduction, sameSite: isProduction ? "none" : "lax" });
};

/**
 * Generate random 6-digit OTP
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Generate random token for password reset
 */
const generateResetToken = () => {
  return require("uuid").v4().replace(/-/g, "") + Date.now().toString(36);
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  setTokenCookies,
  clearTokenCookies,
  generateOTP,
  generateResetToken,
};
