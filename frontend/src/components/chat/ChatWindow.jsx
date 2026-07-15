// ============================================================
// NovaChat - ChatWindow Component (Main Chat Area)
// ============================================================
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import EmojiPicker from "emoji-picker-react";
import { fetchMessages, addMessage } from "../../store/slices/chatSlice";
import { messageAPI } from "../../services/api";
import { joinRoom, startTyping, stopTyping, markMessagesRead, sendSocketMessage } from "../../socket/socketClient";
import toast from "react-hot-toast";
import {
  FiSend, FiPaperclip, FiMic, FiSmile, FiPhone, FiVideo,
  FiMoreVertical, FiInfo, FiSearch, FiChevronLeft,
  FiImage, FiFile, FiX, FiCheck, FiEdit2,
  FiTrash2, FiCopy, FiCornerUpRight, FiStar,
} from "react-icons/fi";
import { IoCheckmarkDone } from "react-icons/io5";
import { uiActions } from "../../store/slices/uiSlice";
import { initiateCall } from "../../socket/socketClient";
import { callActions } from "../../store/slices/callSlice";

const formatMsgTime = (date) => format(new Date(date), "HH:mm");
const formatDateLabel = (date) => {
  const d = new Date(date);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMMM d, yyyy");
};

// Single Message Component
const MessageBubble = ({ message, isOwn, onReact, onReply, onDelete, onEdit }) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  if (message.isDeleted || message.deletedForEveryone) {
    return (
      <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-1`}>
        <div className="px-4 py-2 rounded-2xl bg-white/5 text-slate-500 text-sm italic">
          🚫 Message deleted
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-1 group`}>
      {!isOwn && (
        <div className="w-8 h-8 rounded-full overflow-hidden mr-2 flex-shrink-0 self-end mb-1">
          {message.sender?.avatar?.url ? (
            <img src={message.sender.avatar.url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-nova-gradient flex items-center justify-center text-white text-xs font-bold">
              {message.sender?.displayName?.charAt(0) || "?"}
            </div>
          )}
        </div>
      )}

      <div className="relative max-w-xs">
        {/* Reply preview */}
        {message.replyTo && (
          <div className={`mb-1 px-3 py-2 rounded-xl border-l-2 border-nova-400 bg-white/5 text-xs text-slate-400 ${isOwn ? "ml-auto" : ""}`}>
            <p className="font-medium text-nova-400">{message.replyTo.sender?.displayName}</p>
            <p className="truncate">{message.replyTo.content?.slice(0, 50)}</p>
          </div>
        )}

        {/* Main bubble */}
        <div
          className={`relative px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
            isOwn
              ? "bg-message-sent text-white rounded-br-sm"
              : "bg-surface-raised text-slate-200 rounded-bl-sm"
          }`}
          style={isOwn ? { background: "linear-gradient(135deg, #6366f1, #8b5cf6)" } : {}}
          onContextMenu={(e) => { e.preventDefault(); setShowMenu(true); }}
        >
          {/* Media content */}
          {message.type === "image" && message.media?.url && (
            <img
              src={message.media.url}
              alt="Media"
              className="rounded-xl max-w-[240px] mb-2 cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => window.open(message.media.url, "_blank")}
            />
          )}
          {message.type === "video" && message.media?.url && (
            <video
              src={message.media.url}
              controls
              className="rounded-xl max-w-[240px] mb-2"
            />
          )}
          {message.type === "audio" && message.media?.url && (
            <audio src={message.media.url} controls className="mb-2 max-w-[240px]" />
          )}
          {message.type === "document" && message.media?.url && (
            <a
              href={message.media.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-white/80 hover:text-white mb-2"
            >
              <FiFile size={16} /> <span className="text-xs">{message.media.originalName || "Document"}</span>
            </a>
          )}

          {/* Text content */}
          {message.content && (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          )}

          {/* Reactions */}
          {message.reactions?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {Object.entries(
                message.reactions.reduce((acc, r) => {
                  acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                  return acc;
                }, {})
              ).map(([emoji, count]) => (
                <span
                  key={emoji}
                  onClick={() => onReact(emoji)}
                  className="text-xs bg-white/10 px-2 py-0.5 rounded-full cursor-pointer hover:bg-white/20 transition-colors"
                >
                  {emoji} {count}
                </span>
              ))}
            </div>
          )}

          {/* Time & Status */}
          <div className={`flex items-center gap-1 mt-1 ${isOwn ? "justify-end" : "justify-end"}`}>
            <span className={`text-[10px] ${isOwn ? "text-white/60" : "text-slate-500"}`}>
              {formatMsgTime(message.createdAt)}
              {message.isEdited && <span className="ml-1 italic">edited</span>}
            </span>
            {isOwn && (
              <span className="text-[10px] text-white/60">
                {message.readBy?.length > 0 ? <IoCheckmarkDone size={14} className="text-sky-400" /> : <FiCheck size={12} />}
              </span>
            )}
          </div>
        </div>

        {/* Quick reactions */}
        <div className={`absolute ${isOwn ? "left-0 -translate-x-full" : "right-0 translate-x-full"} top-0 opacity-0 group-hover:opacity-100 transition-opacity`}>
          <div className="flex items-center gap-1 bg-dark-100/90 backdrop-blur border border-white/10 rounded-full px-2 py-1 mx-2">
            {["👍", "❤️", "😂", "😮", "😢"].map((emoji) => (
              <button key={emoji} onClick={() => onReact(emoji)} className="text-sm hover:scale-125 transition-transform">
                {emoji}
              </button>
            ))}
            <button onClick={() => onReply(message)} className="text-slate-400 hover:text-white ml-1">
              <FiCornerUpRight size={12} />
            </button>
            <button onClick={() => setShowMenu(true)} className="text-slate-400 hover:text-white">
              <FiMoreVertical size={12} />
            </button>
          </div>
        </div>

        {/* Context menu */}
        <AnimatePresence>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute top-0 z-50 glass-card rounded-xl p-1 shadow-card min-w-[160px]"
                style={{ [isOwn ? "right" : "left"]: 0 }}
              >
                {[
                  { icon: FiCornerUpRight, label: "Reply", action: () => { onReply(message); setShowMenu(false); } },
                  { icon: FiCopy, label: "Copy", action: () => { navigator.clipboard.writeText(message.content); setShowMenu(false); toast.success("Copied!"); } },
                  { icon: FiStar, label: "Star", action: () => { setShowMenu(false); } },
                  ...(isOwn ? [
                    { icon: FiEdit2, label: "Edit", action: () => { onEdit(message); setShowMenu(false); } },
                    { icon: FiTrash2, label: "Delete", action: () => { onDelete(message); setShowMenu(false); }, danger: true },
                  ] : [
                    { icon: FiTrash2, label: "Delete for me", action: () => { onDelete(message, false); setShowMenu(false); }, danger: true },
                  ]),
                ].map(({ icon: Icon, label, action, danger }) => (
                  <button
                    key={label}
                    onClick={action}
                    className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors ${
                      danger ? "text-red-400 hover:bg-red-500/10" : "text-slate-300 hover:bg-white/5"
                    }`}
                  >
                    <Icon size={14} /> {label}
                  </button>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// ============================================================
// Main ChatWindow
// ============================================================
export default function ChatWindow() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { activeConversation, activeGroup, messages, typingUsers } = useSelector((state) => state.chat);
  const { isMobileView } = useSelector((state) => state.ui);

  const activeItem = activeConversation || activeGroup;
  const conversationId = activeConversation?._id;
  const groupId = activeGroup?._id;
  const roomKey = conversationId || groupId;

  const msgList = messages[roomKey] || [];

  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  const otherParticipant = activeConversation?.participants?.find((p) => p._id !== user?._id);

  const typingList = typingUsers[roomKey] || [];
  const isOtherTyping = typingList.some((uid) => uid !== user?._id);

  // Load messages & join room
  useEffect(() => {
    if (!roomKey) return;
    if (conversationId) {
      dispatch(fetchMessages({ conversationId, params: { limit: 50 } }));
      joinRoom({ conversationId });
    } else if (groupId) {
      joinRoom({ groupId });
    }
    inputRef.current?.focus();
  }, [roomKey, dispatch]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgList.length, isOtherTyping]);

  // Mark messages as read
  useEffect(() => {
    if (msgList.length > 0 && conversationId) {
      const unreadIds = msgList
        .filter((m) => m.sender?._id !== user?._id && !m.readBy?.some((r) => r.user === user?._id))
        .map((m) => m._id);
      if (unreadIds.length > 0) {
        markMessagesRead({ messageIds: unreadIds, conversationId });
      }
    }
  }, [msgList, user, conversationId]);

  // Typing handler
  const handleTyping = useCallback(() => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    startTyping({ conversationId, groupId });
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping({ conversationId, groupId });
    }, 2000);
  }, [conversationId, groupId]);

  // Send message
  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed && !editingMessage) return;

    if (editingMessage) {
      try {
        await messageAPI.edit(editingMessage._id, { content: trimmed });
        setEditingMessage(null);
        setText("");
      } catch {
        toast.error("Failed to edit message");
      }
      return;
    }

    const tempId = `temp_${Date.now()}`;
    const tempMessage = {
      _id: tempId,
      tempId,
      sender: { _id: user._id, displayName: user.displayName, avatar: user.avatar },
      content: trimmed,
      type: "text",
      conversation: conversationId,
      group: groupId,
      replyTo,
      createdAt: new Date().toISOString(),
      isOptimistic: true,
    };

    dispatch(addMessage({ message: tempMessage, conversationId, groupId }));
    sendSocketMessage({ conversationId, groupId, content: trimmed, type: "text", replyTo: replyTo?._id, tempId });

    setText("");
    setReplyTo(null);
    stopTyping({ conversationId, groupId });
  };

  // Handle file send
  const handleFileUpload = async (file) => {
    if (!file) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("media", file);
      if (conversationId) {
        await messageAPI.sendMedia(conversationId, formData);
      } else if (groupId) {
        await messageAPI.sendGroup(groupId, formData);
      }
      toast.success("File sent!");
    } catch {
      toast.error("Failed to send file");
    } finally {
      setIsUploading(false);
    }
  };

  const handleReact = async (emoji, message) => {
    try {
      await messageAPI.react(message._id, { emoji });
    } catch {}
  };

  const handleDelete = async (message, forEveryone = true) => {
    try {
      await messageAPI.delete(message._id, { deleteForEveryone: forEveryone });
    } catch {
      toast.error("Failed to delete message");
    }
  };

  const handleCall = (type) => {
    if (!otherParticipant) return;
    dispatch(callActions.setCallType(type));
    dispatch(callActions.setActiveCall({
      calleeId: otherParticipant._id,
      calleeName: otherParticipant.displayName,
      calleeAvatar: otherParticipant.avatar?.url,
      type,
    }));
    initiateCall({ calleeId: otherParticipant._id, type, conversationId });
  };

  // Group messages by date
  const groupedMessages = msgList.reduce((acc, msg) => {
    const dateKey = format(new Date(msg.createdAt), "yyyy-MM-dd");
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(msg);
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-full bg-[#0f0f1a] relative">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-dark-200/30 backdrop-blur-xl flex-shrink-0">
        {/* Mobile back */}
        {isMobileView && (
          <button
            onClick={() => dispatch(setActiveConversation(null))}
            className="text-slate-400 hover:text-white mr-1"
          >
            <FiChevronLeft size={22} />
          </button>
        )}

        {/* Avatar */}
        <div className="relative">
          <div className="w-10 h-10 rounded-full overflow-hidden">
            {(otherParticipant?.avatar?.url || activeGroup?.avatar?.url) ? (
              <img
                src={otherParticipant?.avatar?.url || activeGroup?.avatar?.url}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-nova-gradient flex items-center justify-center text-white text-sm font-bold">
                {(otherParticipant?.displayName || activeGroup?.name)?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          {otherParticipant?.isOnline && (
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-dark-200" />
          )}
        </div>

        {/* Name & Status */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white truncate">
            {otherParticipant?.displayName || activeGroup?.name || "Unknown"}
            {otherParticipant?.isVerifiedAccount && <span className="ml-1 text-nova-400 text-xs">✓</span>}
          </h3>
          <p className="text-xs truncate">
            {isOtherTyping ? (
              <span className="text-emerald-400 animate-pulse">typing...</span>
            ) : otherParticipant?.isOnline ? (
              <span className="text-emerald-400">Online</span>
            ) : otherParticipant?.lastSeen ? (
              <span className="text-slate-500">last seen {format(new Date(otherParticipant.lastSeen), "HH:mm")}</span>
            ) : activeGroup ? (
              <span className="text-slate-500">{activeGroup.members?.length || 0} members</span>
            ) : null}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button onClick={() => handleCall("voice")} className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all">
            <FiPhone size={17} />
          </button>
          <button onClick={() => handleCall("video")} className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all">
            <FiVideo size={17} />
          </button>
          <button onClick={() => dispatch(uiActions.setRightPanel("profile"))} className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all">
            <FiInfo size={17} />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1" style={{ backgroundImage: "radial-gradient(circle at 20% 80%, rgba(99,102,241,0.03) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(168,85,247,0.03) 0%, transparent 50%)" }}>
        {Object.entries(groupedMessages).map(([dateKey, msgs]) => (
          <div key={dateKey}>
            {/* Date Label */}
            <div className="flex items-center justify-center my-4">
              <div className="px-3 py-1 bg-dark-200/60 backdrop-blur rounded-full text-xs text-slate-500 border border-white/5">
                {formatDateLabel(dateKey)}
              </div>
            </div>

            {msgs.map((msg, i) => (
              <MessageBubble
                key={msg._id || msg.tempId}
                message={msg}
                isOwn={msg.sender?._id === user?._id || msg.sender === user?._id}
                onReact={(emoji) => handleReact(emoji, msg)}
                onReply={setReplyTo}
                onDelete={handleDelete}
                onEdit={(m) => { setEditingMessage(m); setText(m.content); inputRef.current?.focus(); }}
              />
            ))}
          </div>
        ))}

        {/* Typing indicator */}
        {isOtherTyping && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-end gap-2"
          >
            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
              {otherParticipant?.avatar?.url ? (
                <img src={otherParticipant.avatar.url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-nova-gradient flex items-center justify-center text-white text-xs">
                  {otherParticipant?.displayName?.charAt(0) || "?"}
                </div>
              )}
            </div>
            <div className="bg-surface-raised rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1">
              {[0, 1, 2].map((i) => (
                <span key={i} className="typing-dot" style={{ animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Reply Preview */}
      <AnimatePresence>
        {replyTo && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="px-4 py-2 bg-dark-200/60 border-t border-white/5 flex items-center gap-3"
          >
            <div className="flex-1 border-l-2 border-nova-400 pl-3">
              <p className="text-xs text-nova-400 font-medium">{replyTo.sender?.displayName}</p>
              <p className="text-xs text-slate-500 truncate">{replyTo.content}</p>
            </div>
            <button onClick={() => setReplyTo(null)} className="text-slate-500 hover:text-white">
              <FiX size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Banner */}
      <AnimatePresence>
        {editingMessage && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="px-4 py-2 bg-nova-600/10 border-t border-nova-500/20 flex items-center gap-3"
          >
            <FiEdit2 size={14} className="text-nova-400" />
            <p className="text-xs text-nova-400 flex-1">Editing message</p>
            <button onClick={() => { setEditingMessage(null); setText(""); }} className="text-slate-500 hover:text-white">
              <FiX size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <div className="px-4 py-3 border-t border-white/5 bg-dark-200/30 backdrop-blur-xl flex-shrink-0">
        <div className="flex items-end gap-2">
          {/* Attach */}
          <div className="relative">
            <button
              onClick={() => setShowAttach(!showAttach)}
              className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-500 hover:text-nova-400 hover:bg-nova-500/10 transition-all"
            >
              <FiPaperclip size={18} />
            </button>
            <AnimatePresence>
              {showAttach && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 10 }}
                  className="absolute bottom-12 left-0 glass-card p-2 rounded-xl space-y-1 shadow-card min-w-[140px]"
                >
                  {[
                    { icon: FiImage, label: "Photo/Video", accept: "image/*,video/*" },
                    { icon: FiFile, label: "Document", accept: "*/*" },
                    { icon: FiMic, label: "Audio", accept: "audio/*" },
                  ].map(({ icon: Icon, label, accept }) => (
                    <button
                      key={label}
                      onClick={() => {
                        fileInputRef.current.accept = accept;
                        fileInputRef.current.click();
                        setShowAttach(false);
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-white/5 transition-colors"
                    >
                      <Icon size={15} className="text-nova-400" /> {label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => { handleFileUpload(e.target.files[0]); e.target.value = ""; }} />

          {/* Emoji */}
          <div className="relative">
            <button
              onClick={() => setShowEmoji(!showEmoji)}
              className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-500 hover:text-nova-400 hover:bg-nova-500/10 transition-all"
            >
              <FiSmile size={18} />
            </button>
            <AnimatePresence>
              {showEmoji && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 10 }}
                  className="absolute bottom-12 left-0 z-50"
                >
                  <EmojiPicker
                    onEmojiClick={(e) => {
                      setText((t) => t + e.emoji);
                      setShowEmoji(false);
                    }}
                    theme="dark"
                    width={300}
                    height={350}
                    searchDisabled
                    skinTonesDisabled
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Text Input */}
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={text}
              onChange={(e) => { setText(e.target.value); handleTyping(); }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
              }}
              placeholder="Type a message..."
              rows={1}
              className="w-full px-4 py-3 bg-white/5 border border-white/5 rounded-xl text-white placeholder-slate-600 outline-none resize-none focus:border-nova-500/40 transition-all text-sm"
              style={{ maxHeight: "120px", overflowY: "auto" }}
            />
          </div>

          {/* Send / Mic */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSend}
            disabled={isUploading}
            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${
              text.trim() || editingMessage
                ? "bg-nova-gradient text-white shadow-nova"
                : "text-slate-500 hover:text-nova-400 hover:bg-nova-500/10"
            }`}
          >
            {isUploading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : text.trim() || editingMessage ? (
              <FiSend size={16} />
            ) : (
              <FiMic size={18} />
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
