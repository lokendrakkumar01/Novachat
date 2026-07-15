// ============================================================
// NovaChat - Profile Page
// ============================================================
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { motion } from "framer-motion";
import { FiEdit2, FiCamera, FiPhone, FiVideo, FiMessageSquare, FiMoreVertical, FiShield, FiCheckCircle } from "react-icons/fi";
import { userAPI } from "../services/api";
import { updateUser } from "../store/slices/authSlice";
import toast from "react-hot-toast";

export default function ProfilePage() {
  const { userId } = useParams();
  const { user: currentUser } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isOwn = !userId || userId === currentUser?._id;

  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({});

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      try {
        if (isOwn) {
          setProfile(currentUser);
          setForm({
            displayName: currentUser?.displayName || "",
            username: currentUser?.username || "",
            bio: currentUser?.bio || "",
            statusText: currentUser?.statusText || "",
          });
        } else {
          const { data } = await userAPI.getProfile(userId);
          setProfile(data.user);
        }
      } catch {
        toast.error("Failed to load profile");
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, [userId, currentUser, isOwn]);

  const handleSave = async () => {
    try {
      const { data } = await userAPI.updateProfile(form);
      dispatch(updateUser(data.user));
      setProfile(data.user);
      setIsEditing(false);
      toast.success("Profile updated!");
    } catch {
      toast.error("Failed to update profile");
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("avatar", file);
    try {
      const { data } = await userAPI.uploadAvatar(formData);
      dispatch(updateUser({ avatar: data.avatar }));
      setProfile((p) => ({ ...p, avatar: data.avatar }));
      toast.success("Avatar updated!");
    } catch {
      toast.error("Failed to upload avatar");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-nova-500/30 border-t-nova-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f1a]">
      {/* Cover */}
      <div className="h-48 bg-gradient-to-br from-nova-900 to-purple-900 relative overflow-hidden">
        {profile?.coverImage?.url && (
          <img src={profile.coverImage.url} alt="Cover" className="w-full h-full object-cover opacity-60" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f1a] via-transparent to-transparent" />
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 text-white/70 hover:text-white text-sm"
        >
          ← Back
        </button>
      </div>

      <div className="max-w-xl mx-auto px-4 -mt-16 relative z-10">
        {/* Avatar */}
        <div className="flex items-end justify-between mb-4">
          <div className="relative">
            <div className="w-28 h-28 rounded-full border-4 border-[#0f0f1a] overflow-hidden">
              {profile?.avatar?.url ? (
                <img src={profile.avatar.url} alt={profile.displayName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-nova-gradient flex items-center justify-center text-white text-4xl font-bold">
                  {profile?.displayName?.charAt(0).toUpperCase() || "?"}
                </div>
              )}
            </div>
            {isOwn && (
              <label className="absolute bottom-1 right-1 w-8 h-8 bg-nova-gradient rounded-full flex items-center justify-center cursor-pointer shadow-nova">
                <FiCamera size={14} className="text-white" />
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </label>
            )}
          </div>

          {isOwn ? (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="btn-ghost border border-white/10 px-4 py-2 text-sm"
            >
              <FiEdit2 size={14} className="mr-2 inline" />
              {isEditing ? "Cancel" : "Edit Profile"}
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => navigate("/")} className="btn-nova px-4 py-2 text-sm">
                <FiMessageSquare size={14} className="mr-2 inline" />
                Message
              </button>
            </div>
          )}
        </div>

        {/* Profile Info */}
        {isEditing ? (
          <div className="space-y-4 glass-card p-6">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Display Name</label>
              <input
                value={form.displayName}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                className="input-nova"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Username</label>
              <input
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="input-nova"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Bio</label>
              <textarea
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                rows={3}
                className="input-nova resize-none"
                placeholder="Tell people about yourself..."
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Status</label>
              <input
                value={form.statusText}
                onChange={(e) => setForm({ ...form, statusText: e.target.value })}
                className="input-nova"
                placeholder="Your status..."
              />
            </div>
            <button onClick={handleSave} className="btn-nova w-full py-3">
              Save Changes
            </button>
          </div>
        ) : (
          <div>
            <div className="mb-4">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-white">{profile?.displayName}</h1>
                {profile?.isVerifiedAccount && (
                  <FiCheckCircle className="text-nova-400" size={18} />
                )}
              </div>
              <p className="text-slate-500">@{profile?.username}</p>
              {profile?.bio && (
                <p className="text-slate-300 mt-2 text-sm leading-relaxed">{profile.bio}</p>
              )}
              {profile?.statusText && (
                <p className="text-slate-500 text-sm mt-1">💬 {profile.statusText}</p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <span className={`w-2 h-2 rounded-full ${profile?.isOnline ? "bg-emerald-400" : "bg-slate-600"}`} />
                <span className="text-xs text-slate-500">{profile?.isOnline ? "Online" : "Offline"}</span>
              </div>
            </div>

            {/* Stats */}
            {isOwn && (
              <div className="grid grid-cols-3 gap-3 glass-card p-4 mb-4">
                {[
                  { label: "Messages", value: "1.2k" },
                  { label: "Groups", value: "12" },
                  { label: "Contacts", value: profile?.contacts?.length || 0 },
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <p className="text-xl font-bold gradient-text">{s.value}</p>
                    <p className="text-xs text-slate-500">{s.label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Security info */}
            {isOwn && (
              <div className="glass-card p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <FiShield className="text-emerald-400" size={18} />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">End-to-end encrypted</p>
                  <p className="text-xs text-slate-500">Your messages are secure</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
