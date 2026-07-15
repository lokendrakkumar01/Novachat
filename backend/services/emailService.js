// ============================================================
// NovaChat - Email Service (Nodemailer)
// ============================================================
const nodemailer = require("nodemailer");

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
};

/**
 * Send OTP email for email verification
 */
const sendEmailOTP = async (email, otp, displayName = "User") => {
  const transporter = createTransporter();

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #0f0f1a; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; background: #1a1a2e; border-radius: 16px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 40px; text-align: center; }
        .logo { font-size: 32px; font-weight: 800; color: white; letter-spacing: -1px; }
        .tagline { color: rgba(255,255,255,0.8); font-size: 14px; margin-top: 4px; }
        .body { padding: 40px; color: #e2e8f0; }
        .greeting { font-size: 20px; font-weight: 600; color: white; margin-bottom: 16px; }
        .message { color: #94a3b8; line-height: 1.6; margin-bottom: 32px; }
        .otp-box { background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0; }
        .otp-code { font-size: 42px; font-weight: 800; color: white; letter-spacing: 12px; }
        .otp-label { color: rgba(255,255,255,0.8); font-size: 12px; margin-top: 8px; }
        .expiry { background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.3); border-radius: 8px; padding: 12px 16px; color: #94a3b8; font-size: 14px; margin-top: 16px; }
        .footer { text-align: center; padding: 24px; color: #475569; font-size: 12px; border-top: 1px solid rgba(255,255,255,0.05); }
        .warning { color: #f59e0b; font-size: 13px; margin-top: 16px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">⚡ NovaChat</div>
          <div class="tagline">The Future of Communication</div>
        </div>
        <div class="body">
          <div class="greeting">Hello, ${displayName}! 👋</div>
          <div class="message">
            Welcome to NovaChat! To verify your email address and complete your registration, 
            please use the One-Time Password (OTP) below.
          </div>
          <div class="otp-box">
            <div class="otp-code">${otp}</div>
            <div class="otp-label">Your Verification Code</div>
          </div>
          <div class="expiry">
            ⏱️ This OTP expires in <strong>10 minutes</strong>. Do not share it with anyone.
          </div>
          <div class="warning">
            ⚠️ If you didn't request this, please ignore this email and your account will not be created.
          </div>
        </div>
        <div class="footer">
          © 2024 NovaChat. All rights reserved.<br>
          This is an automated message, please do not reply.
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || `NovaChat <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "🔐 NovaChat - Email Verification OTP",
    html,
  });
};

/**
 * Send password reset email
 */
const sendPasswordResetEmail = async (email, resetToken, displayName = "User") => {
  const transporter = createTransporter();
  const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #0f0f1a; margin: 0; }
        .container { max-width: 600px; margin: 0 auto; background: #1a1a2e; border-radius: 16px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #ef4444, #dc2626); padding: 40px; text-align: center; }
        .logo { font-size: 32px; font-weight: 800; color: white; }
        .body { padding: 40px; color: #e2e8f0; }
        .greeting { font-size: 20px; font-weight: 600; color: white; }
        .message { color: #94a3b8; line-height: 1.6; margin: 16px 0 24px; }
        .btn { display: block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; text-decoration: none; padding: 16px 32px; border-radius: 12px; text-align: center; font-weight: 700; font-size: 16px; margin: 24px 0; }
        .expiry { color: #94a3b8; font-size: 13px; }
        .footer { text-align: center; padding: 24px; color: #475569; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header"><div class="logo">⚡ NovaChat</div></div>
        <div class="body">
          <div class="greeting">Password Reset Request</div>
          <div class="message">
            Hi ${displayName}, we received a request to reset your password. 
            Click the button below to reset it.
          </div>
          <a href="${resetUrl}" class="btn">🔐 Reset Password</a>
          <div class="expiry">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</div>
        </div>
        <div class="footer">© 2024 NovaChat. All rights reserved.</div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || `NovaChat <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "🔐 NovaChat - Password Reset",
    html,
  });
};

/**
 * Send welcome email after verification
 */
const sendWelcomeEmail = async (email, displayName = "User") => {
  const transporter = createTransporter();

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #0f0f1a; margin: 0; }
        .container { max-width: 600px; margin: 0 auto; background: #1a1a2e; border-radius: 16px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 40px; text-align: center; }
        .logo { font-size: 32px; font-weight: 800; color: white; }
        .hero { font-size: 48px; text-align: center; padding: 32px; }
        .body { padding: 40px; color: #e2e8f0; text-align: center; }
        .title { font-size: 24px; font-weight: 700; color: white; }
        .message { color: #94a3b8; line-height: 1.6; margin: 16px 0; }
        .features { display: flex; gap: 16px; margin: 24px 0; }
        .feature { background: rgba(99,102,241,0.1); border-radius: 12px; padding: 16px; flex: 1; }
        .feature-icon { font-size: 24px; }
        .feature-title { font-size: 14px; font-weight: 600; color: white; margin-top: 8px; }
        .btn { display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-weight: 700; font-size: 16px; margin: 24px 0; }
        .footer { text-align: center; padding: 24px; color: #475569; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header"><div class="logo">⚡ NovaChat</div></div>
        <div class="hero">🎉</div>
        <div class="body">
          <div class="title">Welcome to NovaChat, ${displayName}!</div>
          <div class="message">
            You've successfully joined the future of communication. 
            Enjoy encrypted messaging, HD video calls, stories, and much more.
          </div>
          <a href="${process.env.CLIENT_URL}" class="btn">🚀 Start Chatting</a>
        </div>
        <div class="footer">© 2024 NovaChat. All rights reserved.</div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || `NovaChat <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "🎉 Welcome to NovaChat!",
    html,
  });
};

/**
 * Send Phone OTP via email (Fallback)
 */
const sendPhoneOTPEmail = async (email, otp, displayName = "User") => {
  const transporter = createTransporter();

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #0f0f1a; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; background: #1a1a2e; border-radius: 16px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 40px; text-align: center; }
        .logo { font-size: 32px; font-weight: 800; color: white; }
        .body { padding: 40px; color: #e2e8f0; }
        .greeting { font-size: 20px; font-weight: 600; color: white; }
        .message { color: #94a3b8; line-height: 1.6; margin-bottom: 24px; }
        .otp-box { background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0; }
        .otp-code { font-size: 42px; font-weight: 800; color: white; letter-spacing: 12px; }
        .footer { text-align: center; padding: 24px; color: #475569; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header"><div class="logo">⚡ NovaChat</div></div>
        <div class="body">
          <div class="greeting">Phone Verification OTP Fallback</div>
          <div class="message">
            Hi ${displayName}, you requested to verify your phone number on NovaChat. 
            Since SMS delivery was unavailable, use the backup One-Time Password (OTP) below to complete verification.
          </div>
          <div class="otp-box">
            <div class="otp-code">${otp}</div>
          </div>
        </div>
        <div class="footer">© 2024 NovaChat. All rights reserved.</div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || `NovaChat <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "🔐 NovaChat - Phone Verification OTP Fallback",
    html,
  });
};

module.exports = {
  sendEmailOTP,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendPhoneOTPEmail,
};
