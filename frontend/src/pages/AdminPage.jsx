// ============================================================
// NovaChat - Admin Dashboard Page
// ============================================================
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { adminAPI } from "../services/api";
import toast from "react-hot-toast";
import {
  FiUsers, FiMessageSquare, FiPhone, FiZap, FiTrendingUp,
  FiAlertCircle, FiCheckCircle, FiSearch, FiArrowLeft,
  FiShield
} from "react-icons/fi";

const StatCard = ({ icon: Icon, label, value, color, sub }) => (
  <div className="glass-card p-5">
    <div className="flex items-center justify-between mb-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 ${color}`}>
        <Icon size={18} />
      </div>
      <span className="text-xs text-slate-500">{sub}</span>
    </div>
    <p className="text-2xl font-bold text-white">{value?.toLocaleString() || 0}</p>
    <p className="text-sm text-slate-500 mt-0.5">{label}</p>
  </div>
);

export default function AdminPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    setIsLoading(true);
    try {
      const [dashRes, usersRes] = await Promise.all([
        adminAPI.getDashboard(),
        adminAPI.getUsers({ limit: 20 }),
      ]);
      setStats(dashRes.data);
      setUsers(usersRes.data.users || []);
    } catch {
      toast.error("Failed to load admin data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBanUser = async (userId, ban) => {
    try {
      await adminAPI.banUser(userId, { ban, reason: "Banned by admin" });
      toast.success(`User ${ban ? "banned" : "unbanned"}`);
      fetchDashboard();
    } catch {
      toast.error("Failed to update user");
    }
  };

  const handleVerifyUser = async (userId, verified) => {
    try {
      await adminAPI.verifyUser(userId, { verified });
      toast.success(`User ${verified ? "verified" : "unverified"}`);
      fetchDashboard();
    } catch {
      toast.error("Failed to verify user");
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f1a]">
      {/* Header */}
      <div className="sticky top-0 bg-dark-200/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center gap-4 z-10">
        <button onClick={() => navigate("/")} className="text-slate-400 hover:text-white">
          <FiArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-2">
          <FiShield className="text-nova-400" size={20} />
          <h1 className="text-lg font-bold text-white">Admin Dashboard</h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {/* Tab navigation */}
        <div className="flex gap-2 mb-6 bg-dark-200/40 p-1 rounded-xl w-fit">
          {["dashboard", "users", "reports"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                activeTab === tab ? "bg-nova-gradient text-white shadow-nova" : "text-slate-400 hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Dashboard Tab */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            {isLoading ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="glass-card p-5 animate-pulse">
                    <div className="w-10 h-10 bg-white/5 rounded-xl mb-3" />
                    <div className="h-6 w-16 bg-white/5 rounded mb-1" />
                    <div className="h-3 w-24 bg-white/5 rounded" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard icon={FiUsers} label="Total Users" value={stats?.stats.users.total} color="text-nova-400" sub={`+${stats?.stats.users.today} today`} />
                  <StatCard icon={FiUsers} label="Online Now" value={stats?.stats.users.online} color="text-emerald-400" sub="Active" />
                  <StatCard icon={FiMessageSquare} label="Total Messages" value={stats?.stats.messages.total} color="text-sky-400" sub={`+${stats?.stats.messages.today} today`} />
                  <StatCard icon={FiPhone} label="Total Calls" value={stats?.stats.calls.total} color="text-purple-400" sub={`${stats?.stats.calls.today} today`} />
                  <StatCard icon={FiZap} label="Groups" value={stats?.stats.groups.total} color="text-yellow-400" sub="Active" />
                  <StatCard icon={FiTrendingUp} label="Stories" value={stats?.stats.stories.active} color="text-pink-400" sub="Active" />
                  <StatCard icon={FiAlertCircle} label="Pending Reports" value={stats?.stats.reports.pending} color="text-red-400" sub="Review needed" />
                  <StatCard icon={FiCheckCircle} label="Conversations" value={stats?.stats.conversations.total} color="text-teal-400" sub="Total" />
                </div>

                {/* Top users */}
                {stats?.topUsers?.length > 0 && (
                  <div className="glass-card p-4">
                    <h3 className="text-sm font-semibold text-white mb-4">Top Active Users</h3>
                    <div className="space-y-3">
                      {stats.topUsers.map((u, i) => (
                        <div key={u._id} className="flex items-center gap-3">
                          <span className="text-slate-600 text-sm w-5">#{i + 1}</span>
                          <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                            {u.avatar?.url ? <img src={u.avatar.url} alt="" className="w-full h-full object-cover" /> : (
                              <div className="w-full h-full bg-nova-gradient flex items-center justify-center text-white text-xs font-bold">
                                {u.displayName?.charAt(0)}
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-white">{u.displayName}</p>
                            <p className="text-xs text-slate-500">@{u.username}</p>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${u.isOnline ? "bg-emerald-500/10 text-emerald-400" : "bg-white/5 text-slate-500"}`}>
                            {u.isOnline ? "Online" : "Offline"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && (
          <div className="glass-card overflow-hidden">
            <div className="p-4 border-b border-white/5 flex gap-3">
              <div className="relative flex-1">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/5 rounded-xl text-sm text-white placeholder-slate-600 outline-none"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5 text-xs text-slate-500 uppercase">
                    <th className="text-left px-4 py-3">User</th>
                    <th className="text-left px-4 py-3">Email</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Role</th>
                    <th className="text-left px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.filter((u) => !searchQuery || u.username?.includes(searchQuery) || u.email?.includes(searchQuery)).map((u) => (
                    <tr key={u._id} className="border-b border-white/3 hover:bg-white/2">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                            {u.avatar?.url ? <img src={u.avatar.url} alt="" className="w-full h-full object-cover" /> : (
                              <div className="w-full h-full bg-nova-gradient flex items-center justify-center text-white text-xs">
                                {u.displayName?.charAt(0)}
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-sm text-white">{u.displayName}</p>
                            <p className="text-xs text-slate-500">@{u.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          u.isBanned ? "bg-red-500/10 text-red-400" :
                          u.isOnline ? "bg-emerald-500/10 text-emerald-400" :
                          "bg-white/5 text-slate-500"
                        }`}>
                          {u.isBanned ? "Banned" : u.isOnline ? "Online" : "Offline"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400 capitalize">{u.role}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleVerifyUser(u._id, !u.isVerifiedAccount)}
                            className={`text-xs px-2 py-1 rounded-lg transition-colors ${
                              u.isVerifiedAccount ? "text-nova-400 hover:text-nova-300" : "text-slate-500 hover:text-nova-400"
                            }`}
                          >
                            {u.isVerifiedAccount ? "Unverify" : "Verify"}
                          </button>
                          <button
                            onClick={() => handleBanUser(u._id, !u.isBanned)}
                            className={`text-xs px-2 py-1 rounded-lg transition-colors ${
                              u.isBanned ? "text-emerald-400 hover:text-emerald-300" : "text-red-400 hover:text-red-300"
                            }`}
                          >
                            {u.isBanned ? "Unban" : "Ban"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
