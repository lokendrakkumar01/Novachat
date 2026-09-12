// ============================================================
// NovaChat - Incoming Call Modal
// ============================================================
import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import { FiPhone, FiPhoneOff, FiVideo } from "react-icons/fi";
import { callActions } from "../../store/slices/callSlice";
import { acceptCall, rejectCall } from "../../socket/socketClient";

export default function IncomingCallModal() {
  const dispatch = useDispatch();
  const { incomingCall } = useSelector((state) => state.call);

  if (!incomingCall) return null;

  const { callId, callerId, type, callerName, callerAvatar, user } = incomingCall;
  const displayName = callerName || user?.displayName || user?.username || "NovaChat Call";
  const avatarUrl = callerAvatar || user?.avatar?.url;

  const handleAccept = () => {
    acceptCall({ callId });
    dispatch(callActions.setActiveCall(incomingCall));
    dispatch(callActions.clearIncomingCall());
    dispatch(callActions.setCallType(type));
  };

  const handleReject = () => {
    rejectCall({ callId });
    dispatch(callActions.clearIncomingCall());
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -50 }}
      className="fixed top-6 right-6 z-50 w-80 bg-[#1a1a2e] border border-white/10 rounded-2xl shadow-2xl p-5"
    >
      {/* Caller info */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-nova-gradient flex items-center justify-center text-white font-bold text-lg flex-shrink-0 overflow-hidden shadow-nova">
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            displayName.charAt(0).toUpperCase()
          )}
        </div>
        <div>
          <p className="text-white font-semibold">{displayName}</p>
          <p className="text-slate-400 text-sm flex items-center gap-1.5">
            {type === "video" ? <FiVideo size={13} /> : <FiPhone size={13} />}
            Incoming {type === "video" ? "video" : "voice"} call
          </p>
        </div>
      </div>

      {/* Pulsing ring animation */}
      <div className="flex justify-center mb-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 animate-ping absolute inset-0" />
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 absolute inset-0 animate-pulse" />
          <FiPhone size={28} className="relative z-10 m-4 text-emerald-400" />
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-4 justify-center">
        <button
          onClick={handleReject}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
        >
          <FiPhoneOff size={18} />
          <span className="text-sm font-medium">Decline</span>
        </button>
        <button
          onClick={handleAccept}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
        >
          {type === "video" ? <FiVideo size={18} /> : <FiPhone size={18} />}
          <span className="text-sm font-medium">Accept</span>
        </button>
      </div>
    </motion.div>
  );
}
