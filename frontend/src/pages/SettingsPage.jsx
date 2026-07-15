// ============================================================
// NovaChat - Interactive Settings Page
// ============================================================
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiUser, FiLock, FiBell, FiEye, FiSun, FiMoon, FiChevronRight,
  FiShield, FiHelpCircle, FiLogOut, FiArrowLeft, FiSmartphone,
  FiCheckCircle, FiChevronLeft, FiKey, FiUserMinus,
} from "react-icons/fi";
import { logoutUser, updateUser } from "../store/slices/authSlice";
import { userAPI, authAPI } from "../services/api";
import toast from "react-hot-toast";

const SECTIONS = [
  {
    title: "Account",
    items: [
      { id: "edit_profile", icon: FiUser, label: "Edit Profile", path: "/profile", color: "text-nova-400" },
      { id: "privacy_security", icon: FiLock, label: "Privacy & Security", color: "text-purple-400" },
      { id: "2fa", icon: FiShield, label: "Two-Factor Authentication", color: "text-emerald-400" },
      { id: "phone", icon: FiSmartphone, label: "Phone Number", color: "text-sky-400" },
    ],
  },
  {
    title: "Preferences",
    items: [
      { id: "notifications", icon: FiBell, label: "Notifications", color: "text-yellow-400" },
      { id: "privacy", icon: FiEye, label: "Privacy", color: "text-pink-400" },
      { id: "appearance", icon: FiSun, label: "Appearance", color: "text-orange-400" },
    ],
  },
  {
    title: "Support",
    items: [
      { id: "help", icon: FiHelpCircle, label: "Help & FAQ", color: "text-slate-400" },
    ],
  },
];

export default function SettingsPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const [activeSection, setActiveSection] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Forms states
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "" });
  const [phone, setPhone] = useState(user?.phone || "");
  const [phoneOTP, setPhoneOTP] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [privacySettings, setPrivacySettings] = useState(user?.privacy || { lastSeen: "everyone", profilePhoto: "everyone", status: "everyone" });
  const [notifSettings, setNotifSettings] = useState(user?.notifications || { showPreviews: true, soundEnabled: true });
  const [blockedUsers, setBlockedUsers] = useState([]);

  useEffect(() => {
    if (user?.privacy) setPrivacySettings(user.privacy);
    if (user?.notifications) setNotifSettings(user.notifications);
    if (user?.phone) setPhone(user.phone);
  }, [user]);

  // Load blocked users
  useEffect(() => {
    if (activeSection === "privacy_security") {
      setBlockedUsers(user?.blockedUsers || []);
    }
  }, [activeSection, user]);

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate("/login");
  };

  // Change Password
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      return toast.error("Please fill in both fields");
    }
    try {
      await userAPI.changePassword(passwordForm);
      toast.success("Password updated successfully!");
      setPasswordForm({ currentPassword: "", newPassword: "" });
      setActiveSection(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Password change failed");
    }
  };

  // Update Privacy Option
  const handlePrivacyChange = async (key, val) => {
    const updated = { ...privacySettings, [key]: val };
    setPrivacySettings(updated);
    try {
      await userAPI.updatePrivacy({ privacy: updated });
      dispatch(updateUser({ privacy: updated }));
      toast.success("Privacy settings saved");
    } catch {
      toast.error("Failed to update privacy");
    }
  };

  // Update Notification Option
  const handleNotificationChange = async (key, val) => {
    const updated = { ...notifSettings, [key]: val };
    setNotifSettings(updated);
    try {
      await userAPI.updateNotifications({ notifications: updated });
      dispatch(updateUser({ notifications: updated }));
      toast.success("Notification preferences updated");
    } catch {
      toast.error("Failed to update notifications");
    }
  };

  // SMS Verification
  const handleSendPhoneOTP = async () => {
    if (!phone) return toast.error("Please enter a phone number");
    try {
      await authAPI.sendPhoneOTP({ phone });
      setOtpSent(true);
      toast.success("OTP sent to your phone!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send OTP");
    }
  };

  const handleVerifyPhone = async () => {
    if (!phoneOTP) return toast.error("Please enter the OTP");
    try {
      await authAPI.verifyPhone({ phone, otp: phoneOTP });
      dispatch(updateUser({ phone, isPhoneVerified: true }));
      toast.success("Phone number verified successfully!");
      setOtpSent(false);
      setActiveSection(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Verification failed");
    }
  };

  // Unblock user
  const handleUnblock = async (blockedId) => {
    try {
      await userAPI.unblockUser(blockedId);
      toast.success("User unblocked");
      const updatedBlocked = blockedUsers.filter((id) => id !== blockedId);
      setBlockedUsers(updatedBlocked);
      dispatch(updateUser({ blockedUsers: updatedBlocked }));
    } catch {
      toast.error("Failed to unblock user");
    }
  };

  const renderActiveSection = () => {
    switch (activeSection) {
      case "privacy_security":
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <h2 className="text-xl font-bold text-white mb-4">Privacy & Security</h2>

            {/* Change Password */}
            <form onSubmit={handlePasswordChange} className="glass-card p-6 space-y-4">
              <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <FiKey size={16} /> Change Password
              </h3>
              <input
                type="password"
                placeholder="Current Password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                className="input-nova"
              />
              <input
                type="password"
                placeholder="New Password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                className="input-nova"
              />
              <button type="submit" className="btn-nova w-full py-2.5">Update Password</button>
            </form>

            {/* Blocked Users */}
            <div className="glass-card p-6">
              <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2 mb-4">
                <FiUserMinus size={16} /> Blocked Users ({blockedUsers.length})
              </h3>
              {blockedUsers.length === 0 ? (
                <p className="text-xs text-slate-500">No blocked users</p>
              ) : (
                <div className="space-y-2">
                  {blockedUsers.map((id) => (
                    <div key={id} className="flex items-center justify-between py-2 border-b border-white/5">
                      <span className="text-sm text-slate-300">{id}</span>
                      <button onClick={() => handleUnblock(id)} className="text-xs text-red-400 hover:underline">
                        Unblock
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        );

      case "2fa":
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass-card p-6 space-y-4">
            <h2 className="text-xl font-bold text-white mb-2">Two-Factor Authentication</h2>
            <p className="text-sm text-slate-400">Secure your account by requiring an OTP when logging in from new devices.</p>
            <div className="flex items-center justify-between pt-4 border-t border-white/5">
              <div>
                <p className="text-sm font-medium text-white">Email 2FA</p>
                <p className="text-xs text-slate-500">Send verification code to your email</p>
              </div>
              <button className="w-10 h-5 bg-white/10 rounded-full relative">
                <span className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full" />
              </button>
            </div>
          </motion.div>
        );

      case "phone":
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass-card p-6 space-y-4">
            <h2 className="text-xl font-bold text-white mb-2">Verify Phone Number</h2>
            <p className="text-sm text-slate-400">Verify your mobile phone to receive login backup OTPs via SMS.</p>
            {!otpSent ? (
              <div className="space-y-4 pt-2">
                <input
                  type="tel"
                  placeholder="+1234567890 (with country code)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="input-nova"
                />
                <button onClick={handleSendPhoneOTP} className="btn-nova w-full py-2.5">
                  Send Verification OTP
                </button>
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                <p className="text-xs text-slate-500">Enter the 6-digit OTP sent to {phone}</p>
                <input
                  type="text"
                  placeholder="Enter OTP"
                  value={phoneOTP}
                  onChange={(e) => setPhoneOTP(e.target.value)}
                  className="input-nova text-center font-bold text-lg letter-spacing-2"
                />
                <div className="flex gap-2">
                  <button onClick={() => setOtpSent(false)} className="btn-ghost flex-1 py-2">
                    Back
                  </button>
                  <button onClick={handleVerifyPhone} className="btn-nova flex-1 py-2">
                    Verify & Save
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        );

      case "notifications":
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass-card p-6 space-y-4">
            <h2 className="text-xl font-bold text-white mb-4">Notification Settings</h2>
            {[
              { key: "soundEnabled", label: "Sounds", desc: "Play sounds for incoming messages" },
              { key: "showPreviews", label: "Message Previews", desc: "Show previews in notifications" },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                <div>
                  <p className="text-sm font-medium text-white">{label}</p>
                  <p className="text-xs text-slate-500">{desc}</p>
                </div>
                <button
                  onClick={() => handleNotificationChange(key, !notifSettings[key])}
                  className={`w-10 h-5 rounded-full relative transition-colors ${notifSettings[key] ? "bg-nova-600" : "bg-white/20"}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${notifSettings[key] ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
              </div>
            ))}
          </motion.div>
        );

      case "privacy":
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass-card p-6 space-y-6">
            <h2 className="text-xl font-bold text-white mb-2">Privacy Settings</h2>
            {[
              { key: "lastSeen", label: "Last Seen & Online status" },
              { key: "profilePhoto", label: "Profile Photo visibility" },
              { key: "status", label: "Status update updates" },
            ].map(({ key, label }) => (
              <div key={key} className="space-y-2">
                <p className="text-sm font-medium text-white">{label}</p>
                <div className="flex gap-2">
                  {["everyone", "contacts", "nobody"].map((opt) => (
                    <button
                      key={opt}
                      onClick={() => handlePrivacyChange(key, opt)}
                      className={`flex-1 py-2 text-xs rounded-xl border transition-all ${
                        privacySettings[key] === opt
                          ? "bg-nova-600/20 border-nova-500 text-nova-400 shadow-nova"
                          : "border-white/5 hover:bg-white/3 text-slate-400"
                      }`}
                    >
                      {opt.charAt(0).toUpperCase() + opt.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        );

      case "help":
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass-card p-6 space-y-4">
            <h2 className="text-xl font-bold text-white mb-4">Help & FAQ</h2>
            <div className="space-y-4">
              {[
                { q: "Is NovaChat secure?", a: "Yes! NovaChat uses high-end authentication and secure sessions for all communications." },
                { q: "How does screen sharing work?", a: "During a video call, click the monitor icon to share your screen with the peer." },
                { q: "How long do stories last?", a: "All status updates and stories automatically expire after exactly 24 hours." },
              ].map((faq) => (
                <div key={faq.q} className="border-b border-white/5 pb-3 last:border-0">
                  <p className="text-sm font-medium text-white">{faq.q}</p>
                  <p className="text-xs text-slate-500 mt-1">{faq.a}</p>
                </div>
              ))}
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f1a]">
      {/* Header */}
      <div className="sticky top-0 bg-dark-200/80 backdrop-blur-xl border-b border-white/5 px-4 py-4 flex items-center gap-4 z-20">
        <button
          onClick={() => (activeSection ? setActiveSection(null) : navigate(-1))}
          className="text-slate-400 hover:text-white transition-colors"
        >
          <FiChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-bold text-white">
          {activeSection ? "Settings" : "Settings"}
        </h1>
      </div>

      <div className="max-w-xl mx-auto p-4 space-y-6">
        <AnimatePresence mode="wait">
          {!activeSection ? (
            <motion.div
              key="main_settings"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Profile Card */}
              <div
                className="glass-card p-4 flex items-center gap-4 cursor-pointer"
                onClick={() => navigate("/profile")}
              >
                <div className="w-16 h-16 rounded-2xl overflow-hidden">
                  {user?.avatar?.url ? (
                    <img src={user.avatar.url} alt={user.displayName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-nova-gradient flex items-center justify-center text-white text-2xl font-bold">
                      {user?.displayName?.charAt(0).toUpperCase() || "?"}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-white font-semibold">{user?.displayName}</h2>
                    {user?.isVerifiedAccount && <span className="text-nova-400 text-xs">✓</span>}
                  </div>
                  <p className="text-slate-500 text-sm">@{user?.username}</p>
                  <p className="text-slate-600 text-xs mt-0.5">{user?.bio || "No bio yet"}</p>
                </div>
                <FiChevronRight className="text-slate-500" size={18} />
              </div>

              {/* Sections list */}
              {SECTIONS.map((section, si) => (
                <div key={section.title} className="glass-card overflow-hidden">
                  <p className="text-xs text-slate-600 uppercase tracking-wider px-4 pt-4 pb-2">{section.title}</p>
                  {section.items.map(({ id, icon: Icon, label, path, color }, i) => (
                    <button
                      key={id}
                      onClick={() => (path ? navigate(path) : setActiveSection(id))}
                      className={`flex items-center gap-3 w-full px-4 py-3.5 hover:bg-white/3 transition-all ${
                        i < section.items.length - 1 ? "border-b border-white/5" : ""
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center bg-white/5 ${color}`}>
                        <Icon size={16} />
                      </div>
                      <span className="flex-1 text-sm text-white text-left">{label}</span>

                      {id === "appearance" ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); setIsDarkMode(!isDarkMode); }}
                          className={`w-10 h-5 rounded-full relative transition-colors ${isDarkMode ? "bg-nova-600" : "bg-white/20"}`}
                        >
                          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${isDarkMode ? "translate-x-5" : "translate-x-0.5"}`} />
                        </button>
                      ) : (
                        <FiChevronRight className="text-slate-600" size={16} />
                      )}
                    </button>
                  ))}
                </div>
              ))}

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3.5 glass-card text-red-400 hover:bg-red-500/5 transition-all rounded-2xl"
              >
                <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-red-500/10">
                  <FiLogOut size={16} />
                </div>
                <span className="text-sm font-medium">Logout</span>
              </button>
            </motion.div>
          ) : (
            <div key="active_section">{renderActiveSection()}</div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
