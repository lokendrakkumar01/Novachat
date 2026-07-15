// ============================================================
// NovaChat - Sidebar Component
// Left navigation with tabs for chats, groups, channels, stories
// ============================================================
import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { uiActions } from "../../store/slices/uiSlice";
import { logoutUser } from "../../store/slices/authSlice";
import toast from "react-hot-toast";
import {
  FiMessageSquare, FiUsers, FiRadio, FiCircle,
  FiPhone, FiBell, FiSettings, FiLogOut, FiUser,
  FiZap, FiStar
} from "react-icons/fi";
import { HiOutlineSparkles } from "react-icons/hi2";

const NAV_ITEMS = [
  { id: "chats", icon: FiMessageSquare, label: "Chats" },
  { id: "groups", icon: FiUsers, label: "Groups" },
  { id: "channels", icon: FiRadio, label: "Channels" },
  { id: "stories", icon: FiCircle, label: "Stories" },
  { id: "calls", icon: FiPhone, label: "Calls" },
];

export default function Sidebar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { activeTab } = useSelector((state) => state.ui);
  const { unreadCount } = useSelector((state) => state.notifications);

  const [imgError, setImgError] = useState(false);

  const handleLogout = async () => {
    await dispatch(logoutUser());
    toast.success("Logged out successfully");
    navigate("/login");
  };

  return (
    <div className="w-16 bg-dark-200/80 border-r border-white/5 flex flex-col items-center py-4 gap-2 relative z-10 backdrop-blur-xl">
      {/* Logo */}
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="w-10 h-10 rounded-xl bg-nova-gradient flex items-center justify-center mb-4 cursor-pointer shadow-nova"
        onClick={() => navigate("/")}
      >
        <FiZap size={20} className="text-white" />
      </motion.div>

      {/* Navigation Items */}
      <nav className="flex flex-col gap-1 flex-1">
        {NAV_ITEMS.map(({ id, icon: Icon, label }) => (
          <motion.button
            key={id}
            onClick={() => dispatch(uiActions.setActiveTab(id))}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            title={label}
            className={`relative w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 group ${
              activeTab === id
                ? "bg-nova-gradient text-white shadow-nova"
                : "text-slate-500 hover:text-white hover:bg-white/5"
            }`}
          >
            <Icon size={18} />
            {/* Tooltip */}
            <div className="absolute left-full ml-2 px-2 py-1 bg-dark-100/90 backdrop-blur text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              {label}
            </div>
          </motion.button>
        ))}

        {/* AI Assistant */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          title="Nova AI"
          onClick={() => dispatch(uiActions.setActiveTab("ai"))}
          className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 group ${
            activeTab === "ai"
              ? "bg-gradient-to-br from-violet-500 to-purple-600 text-white"
              : "text-slate-500 hover:text-violet-400 hover:bg-violet-500/10"
          }`}
        >
          <HiOutlineSparkles size={18} />
        </motion.button>
      </nav>

      {/* Bottom actions */}
      <div className="flex flex-col gap-1 mt-auto">
        {/* Notifications */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          title="Notifications"
          onClick={() => dispatch(uiActions.setActiveTab("notifications"))}
          className="relative w-10 h-10 flex items-center justify-center rounded-xl text-slate-500 hover:text-white hover:bg-white/5 transition-all duration-200"
        >
          <FiBell size={18} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 text-[10px] font-bold bg-nova-gradient text-white rounded-full flex items-center justify-center px-1">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </motion.button>

        {/* Settings */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          title="Settings"
          onClick={() => navigate("/settings")}
          className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-500 hover:text-white hover:bg-white/5 transition-all"
        >
          <FiSettings size={18} />
        </motion.button>

        {/* Avatar / Profile */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title="Profile"
          onClick={() => navigate("/profile")}
          className="relative w-10 h-10 rounded-xl overflow-hidden ring-2 ring-nova-500/30 hover:ring-nova-500/70 transition-all mt-2"
        >
          {!imgError && user?.avatar?.url ? (
            <img
              src={user.avatar.url}
              alt={user.displayName}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full bg-nova-gradient flex items-center justify-center text-white text-sm font-bold animate-fade-in">
              {user?.displayName?.charAt(0).toUpperCase() || "?"}
            </div>
          )}
          {/* Online indicator */}
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full border border-dark-200" />
        </motion.button>

        {/* Logout */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          title="Logout"
          onClick={handleLogout}
          className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all mt-1"
        >
          <FiLogOut size={18} />
        </motion.button>
      </div>
    </div>
  );
}
