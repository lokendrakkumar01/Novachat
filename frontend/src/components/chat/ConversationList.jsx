// ============================================================
// NovaChat - Conversation List Panel (Interactive Sidebar Tabs)
// Shows all chats, groups, channels, calls, stories, notifications
// ============================================================
import React, { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { format, isToday, isYesterday } from "date-fns";
import {
  FiSearch, FiEdit, FiPlus, FiPhone, FiVideo, FiBell, FiTrash2,
  FiRadio, FiInfo, FiCheck, FiHeart, FiPlayCircle, FiZap
} from "react-icons/fi";
import {
  fetchConversations, fetchGroups, setActiveConversation,
  setActiveGroup, openConversation,
} from "../../store/slices/chatSlice";
import { uiActions } from "../../store/slices/uiSlice";
import { userAPI, callAPI, notificationAPI, storyAPI, channelAPI } from "../../services/api";
import { callActions } from "../../store/slices/callSlice";
import { initiateCall } from "../../socket/socketClient";
import toast from "react-hot-toast";

// Format last message time
const formatTime = (date) => {
  if (!date) return "";
  const d = new Date(date);
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMM d");
};

// User Avatar component
const Avatar = ({ user, size = "md" }) => {
  const [imgError, setImgError] = useState(false);
  const sizes = { sm: "w-8 h-8 text-xs", md: "w-12 h-12 text-sm", lg: "w-14 h-14 text-base" };
  return (
    <div className={`relative flex-shrink-0 ${sizes[size]}`}>
      <div className={`${sizes[size]} rounded-full overflow-hidden`}>
        {!imgError && user?.avatar?.url ? (
          <img
            src={user.avatar.url}
            alt={user.displayName}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full bg-nova-gradient flex items-center justify-center text-white font-semibold">
            {user?.displayName?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase() || "?"}
          </div>
        )}
      </div>
      {user?.isOnline && (
        <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-dark-100" />
      )}
    </div>
  );
};

// Conversation Item
const ConversationItem = ({ conversation, currentUserId, isActive, onClick }) => {
  const otherParticipant = conversation.participants?.find(
    (p) => p._id !== currentUserId
  ) || conversation.participants?.[0];

  const lastMsg = conversation.lastMessage;
  const unread = conversation.unreadCount?.find((u) => u.user === currentUserId)?.count || 0;

  const getLastMessagePreview = () => {
    if (!lastMsg) return "No messages yet";
    if (lastMsg.isDeleted || lastMsg.deletedForEveryone) return "🚫 Message deleted";
    const isMe = lastMsg.sender?._id === currentUserId || lastMsg.sender === currentUserId;
    const prefix = isMe ? "You: " : "";
    switch (lastMsg.type) {
      case "image": return `${prefix}📷 Photo`;
      case "video": return `${prefix}🎥 Video`;
      case "audio": return `${prefix}🎵 Audio`;
      case "voice": return `${prefix}🎤 Voice message`;
      case "document": return `${prefix}📄 Document`;
      default: return `${prefix}${lastMsg.content?.slice(0, 50) || ""}`;
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={onClick}
      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 group ${
        isActive
          ? "bg-nova-600/15 border border-nova-500/20"
          : "hover:bg-white/4"
      }`}
    >
      <Avatar user={otherParticipant} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <h3 className="text-sm font-semibold text-white truncate">
            {otherParticipant?.displayName || otherParticipant?.username || "Unknown"}
            {otherParticipant?.isVerifiedAccount && (
              <span className="ml-1 text-nova-400 text-xs">✓</span>
            )}
          </h3>
          <span className="text-xs text-slate-500 flex-shrink-0 ml-2">
            {formatTime(conversation.updatedAt || lastMsg?.createdAt)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500 truncate">{getLastMessagePreview()}</p>
          {unread > 0 && (
            <span className="flex-shrink-0 ml-2 min-w-[18px] h-[18px] bg-nova-gradient text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// Group Item
const GroupItem = ({ group, isActive, onClick }) => (
  <motion.div
    layout
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    onClick={onClick}
    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 ${
      isActive ? "bg-nova-600/15 border border-nova-500/20" : "hover:bg-white/4"
    }`}
  >
    <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
      {group.avatar?.url ? (
        <img src={group.avatar.url} alt={group.name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
          {group.name?.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-0.5">
        <h3 className="text-sm font-semibold text-white truncate">{group.name}</h3>
        <span className="text-xs text-slate-500">{group.members?.length || 0} members</span>
      </div>
      <p className="text-xs text-slate-500 truncate">
        {group.lastMessage?.content || "No messages yet"}
      </p>
    </div>
  </motion.div>
);

export default function ConversationList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { conversations, groups, activeConversation, activeGroup, isLoading } = useSelector((state) => state.chat);
  const { activeTab } = useSelector((state) => state.ui);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Custom states for interactive tabs
  const [calls, setCalls] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [stories, setStories] = useState([]);
  const [channels, setChannels] = useState([]);

  // Fetch calls history
  const fetchCallsHistory = async () => {
    try {
      const { data } = await callAPI.getHistory();
      setCalls(data.calls || []);
    } catch {}
  };

  // Fetch notifications
  const fetchNotifs = async () => {
    try {
      const { data } = await notificationAPI.getAll();
      setNotifications(data.notifications || []);
    } catch {}
  };

  // Fetch stories
  const fetchStoriesFeed = async () => {
    try {
      const { data } = await storyAPI.getFeed();
      setStories(data.stories || []);
    } catch {}
  };

  // Fetch channels
  const fetchAllChannels = async () => {
    try {
      const { data } = await channelAPI.getAll();
      setChannels(data.channels || []);
    } catch {}
  };

  // Trigger loads based on activeTab
  useEffect(() => {
    if (!searchQuery) {
      if (activeTab === "calls") fetchCallsHistory();
      if (activeTab === "notifications") fetchNotifs();
      if (activeTab === "stories") fetchStoriesFeed();
      if (activeTab === "channels") fetchAllChannels();
    }
  }, [activeTab, searchQuery]);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const timeout = setTimeout(async () => {
      setIsSearching(true);
      try {
        const { data } = await userAPI.search(searchQuery);
        setSearchResults(data.users);
      } catch {} finally {
        setIsSearching(false);
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const handleUserClick = async (targetUser) => {
    setSearchQuery("");
    setSearchResults([]);
    const result = await dispatch(openConversation(targetUser._id));
    if (openConversation.fulfilled.match(result)) {
      dispatch(setActiveConversation(result.payload));
      dispatch(uiActions.setActiveTab("chats"));
    } else {
      toast.error("Failed to open conversation");
    }
  };

  const handleCallback = (targetUser, type) => {
    dispatch(callActions.setCallType(type));
    dispatch(callActions.setActiveCall({
      calleeId: targetUser._id,
      calleeName: targetUser.displayName,
      calleeAvatar: targetUser.avatar?.url,
      type,
    }));
    initiateCall({ calleeId: targetUser._id, type });
  };

  const handleMarkNotificationRead = async (id) => {
    try {
      await notificationAPI.markRead(id);
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
      toast.success("Notification read");
    } catch {}
  };

  const getHeaderTitle = () => {
    const titles = { chats: "Messages", groups: "Groups", channels: "Channels", stories: "Stories", calls: "Calls", ai: "Nova AI", notifications: "Notifications" };
    return titles[activeTab] || "Messages";
  };

  return (
    <div className="flex flex-col h-full bg-dark-200/30">
      {/* Header */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">{getHeaderTitle()}</h2>
          <div className="flex gap-1">
            <button
              onClick={() => dispatch(uiActions.openModal("new_message"))}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
              title="New Message"
            >
              <FiEdit size={16} />
            </button>
            <button
              onClick={() => dispatch(uiActions.openModal(activeTab === "groups" ? "create_group" : "create_channel"))}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
              title="New Group/Channel"
            >
              <FiPlus size={16} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
          <input
            type="text"
            placeholder={`Search ${getHeaderTitle().toLowerCase()}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/5 rounded-xl text-sm text-white placeholder-slate-600 outline-none focus:border-nova-500/40 transition-all"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto hide-scrollbar p-2 space-y-1">
        {/* Search Results */}
        {searchQuery && searchResults.length > 0 && (
          <div className="mb-2">
            <p className="text-xs text-slate-500 px-2 mb-2">Users</p>
            {searchResults.map((u) => (
              <motion.div
                key={u._id}
                onClick={() => handleUserClick(u)}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 cursor-pointer transition-all"
              >
                <div className="relative w-10 h-10">
                  {u.avatar?.url ? (
                    <img src={u.avatar.url} alt={u.displayName} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-nova-gradient flex items-center justify-center text-white text-sm font-bold">
                      {u.displayName?.charAt(0) || u.username?.charAt(0)}
                    </div>
                  )}
                  {u.isOnline && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full border border-dark-200" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{u.displayName}</p>
                  <p className="text-xs text-slate-500">@{u.username}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Chats Tab */}
        {activeTab === "chats" && !searchQuery && (
          <>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                  <div className="w-12 h-12 rounded-full bg-white/5" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-white/5 rounded w-3/4" />
                    <div className="h-2 bg-white/5 rounded w-1/2" />
                  </div>
                </div>
              ))
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="text-5xl mb-4">💬</div>
                <p className="text-slate-400 text-sm">No conversations yet</p>
                <p className="text-slate-600 text-xs mt-1">Search for users to start chatting</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <ConversationItem
                  key={conv._id}
                  conversation={conv}
                  currentUserId={user?._id}
                  isActive={activeConversation?._id === conv._id}
                  onClick={() => dispatch(setActiveConversation(conv))}
                />
              ))
            )}
          </>
        )}

        {/* Groups Tab */}
        {activeTab === "groups" && !searchQuery && (
          <>
            {groups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="text-5xl mb-4">👥</div>
                <p className="text-slate-400 text-sm">No groups yet</p>
                <p className="text-slate-600 text-xs mt-1">Create or join a group</p>
              </div>
            ) : (
              groups.map((group) => (
                <GroupItem
                  key={group._id}
                  group={group}
                  isActive={activeGroup?._id === group._id}
                  onClick={() => dispatch(setActiveGroup(group))}
                />
              ))
            )}
          </>
        )}

        {/* Calls Tab (History List) */}
        {activeTab === "calls" && !searchQuery && (
          <>
            {calls.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="text-5xl mb-4">📞</div>
                <p className="text-slate-400 text-sm">No call history</p>
                <p className="text-slate-600 text-xs mt-1">Voice & Video calls will show here</p>
              </div>
            ) : (
              calls.map((call) => {
                const other = call.caller?._id === user?._id ? call.receivers[0]?.user : call.caller;
                return (
                  <motion.div
                    key={call._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-white/4 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                        {other?.avatar?.url ? <img src={other.avatar.url} alt="" className="w-full h-full object-cover" /> : (
                          <div className="w-full h-full bg-nova-gradient flex items-center justify-center text-white text-sm font-bold">
                            {other?.displayName?.charAt(0) || "?"}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white truncate">{other?.displayName || "Unknown"}</p>
                        <p className="text-xs text-slate-500">
                          {format(new Date(call.createdAt), "MMM d, HH:mm")} • <span className="capitalize">{call.type}</span>
                        </p>
                      </div>
                    </div>
                    {other && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleCallback(other, "voice")} className="w-8 h-8 rounded-lg bg-white/5 text-slate-300 hover:text-white flex items-center justify-center">
                          <FiPhone size={14} />
                        </button>
                        <button onClick={() => handleCallback(other, "video")} className="w-8 h-8 rounded-lg bg-white/5 text-slate-300 hover:text-white flex items-center justify-center">
                          <FiVideo size={14} />
                        </button>
                      </div>
                    )}
                  </motion.div>
                );
              })
            )}
          </>
        )}

        {/* Notifications Tab */}
        {activeTab === "notifications" && !searchQuery && (
          <>
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="text-5xl mb-4">🔔</div>
                <p className="text-slate-400 text-sm">All caught up!</p>
                <p className="text-slate-600 text-xs mt-1">No system alerts or updates</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <motion.div
                  key={notif._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`p-3 rounded-xl flex items-start gap-3 border border-white/3 transition-all ${
                    notif.isRead ? "bg-dark-200/20" : "bg-nova-600/10 border-nova-500/20 shadow-nova"
                  }`}
                >
                  <div className="w-8 h-8 rounded-xl bg-nova-500/10 flex items-center justify-center flex-shrink-0 text-nova-400">
                    <FiBell size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{notif.title}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{notif.body}</p>
                    <span className="text-[10px] text-slate-600 block mt-1">{formatTime(notif.createdAt)}</span>
                  </div>
                  {!notif.isRead && (
                    <button
                      onClick={() => handleMarkNotificationRead(notif._id)}
                      className="w-6 h-6 rounded-lg bg-white/5 text-nova-400 hover:bg-white/10 flex items-center justify-center"
                      title="Mark as Read"
                    >
                      <FiCheck size={12} />
                    </button>
                  )}
                </motion.div>
              ))
            )}
          </>
        )}

        {/* Stories Tab */}
        {activeTab === "stories" && !searchQuery && (
          <>
            {stories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="text-5xl mb-4">📖</div>
                <p className="text-slate-400 text-sm">No stories yet</p>
                <p className="text-slate-600 text-xs mt-1">Go to Stories page in the menu to add one</p>
              </div>
            ) : (
              stories.map((storyGroup) => (
                <div
                  key={storyGroup.author._id}
                  onClick={() => navigate("/stories")}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/4 cursor-pointer"
                >
                  <div className={`p-0.5 rounded-full ${storyGroup.hasUnviewed ? "story-ring" : "story-ring-viewed"}`}>
                    <div className="w-10 h-10 rounded-full overflow-hidden border border-dark-100">
                      {storyGroup.author.avatar?.url ? <img src={storyGroup.author.avatar.url} alt="" className="w-full h-full object-cover" /> : (
                        <div className="w-full h-full bg-nova-gradient flex items-center justify-center text-white text-xs font-bold">
                          {storyGroup.author.displayName?.charAt(0)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{storyGroup.author.displayName}</p>
                    <p className="text-xs text-slate-500">{storyGroup.stories.length} status updates</p>
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {/* Channels Tab */}
        {activeTab === "channels" && !searchQuery && (
          <>
            {channels.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="text-5xl mb-4">📢</div>
                <p className="text-slate-400 text-sm">No channels subscribed</p>
                <p className="text-slate-600 text-xs mt-1">Subscribe to channels to get broadcast updates</p>
              </div>
            ) : (
              channels.map((chan) => (
                <div key={chan._id} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-nova-500/10 rounded-full flex items-center justify-center text-nova-400">
                      <FiRadio size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{chan.name}</p>
                      <p className="text-xs text-slate-500">@{chan.handle}</p>
                    </div>
                  </div>
                  <button className="text-xs text-nova-400 font-semibold px-3 py-1 bg-nova-500/10 hover:bg-nova-500/20 rounded-lg">
                    View
                  </button>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}
