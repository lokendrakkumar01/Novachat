// ============================================================
// NovaChat - Call Modal (Active Call UI)
// ============================================================
import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import {
  FiMic, FiMicOff, FiVideo, FiVideoOff, FiPhoneOff,
  FiMonitor, FiVolume2, FiMinimize2,
} from "react-icons/fi";
import { callActions } from "../../store/slices/callSlice";
import { endCall } from "../../socket/socketClient";

export default function CallModal() {
  const dispatch = useDispatch();
  const { activeCall, callType, isMuted, isVideoOff, isScreenSharing, callStatus } = useSelector(
    (state) => state.call
  );
  const { user } = useSelector((state) => state.auth);
  const [duration, setDuration] = useState(0);
  const timerRef = useRef(null);

  // Extract caller info from activeCall object
  const callerName =
    activeCall?.displayName ||
    activeCall?.username ||
    activeCall?.user?.displayName ||
    activeCall?.recipient?.displayName ||
    activeCall?.participants?.find((p) => p._id !== user?._id)?.displayName ||
    "NovaChat Call";

  const callerAvatar =
    activeCall?.avatar?.url ||
    activeCall?.user?.avatar?.url ||
    activeCall?.recipient?.avatar?.url ||
    activeCall?.participants?.find((p) => p._id !== user?._id)?.avatar?.url;

  // Start timer when call is ongoing
  useEffect(() => {
    if (callStatus === "ongoing") {
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [callStatus]);

  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleEndCall = () => {
    if (activeCall?._id) endCall({ callId: activeCall._id });
    dispatch(callActions.endCall());
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-md bg-[#1a1a2e] rounded-3xl shadow-2xl overflow-hidden border border-white/10">
        {/* Header */}
        <div className="p-6 text-center">
          <div className="w-20 h-20 rounded-full bg-nova-gradient mx-auto mb-4 flex items-center justify-center text-white text-3xl font-bold overflow-hidden shadow-nova">
            {callerAvatar ? (
              <img src={callerAvatar} alt={callerName} className="w-full h-full object-cover" />
            ) : (
              callerName.charAt(0).toUpperCase()
            )}
          </div>
          <h2 className="text-xl font-bold text-white">
            {callerName}
          </h2>
          <p className="text-slate-400 text-sm mt-1 capitalize">
            {callStatus === "ongoing" ? formatDuration(duration) : callStatus === "idle" ? "Connecting..." : callStatus}
          </p>
        </div>

        {/* Video area (placeholder) */}
        {callType === "video" && (
          <div className="mx-4 mb-4 bg-dark-200 rounded-2xl h-48 flex items-center justify-center text-slate-500">
            <FiVideo size={48} />
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 p-6">
          <button
            onClick={() => dispatch(callActions.toggleMute())}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
              isMuted ? "bg-red-500/20 text-red-400" : "bg-white/10 text-white"
            }`}
          >
            {isMuted ? <FiMicOff size={20} /> : <FiMic size={20} />}
          </button>

          {callType === "video" && (
            <button
              onClick={() => dispatch(callActions.toggleVideo())}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                isVideoOff ? "bg-red-500/20 text-red-400" : "bg-white/10 text-white"
              }`}
            >
              {isVideoOff ? <FiVideoOff size={20} /> : <FiVideo size={20} />}
            </button>
          )}

          <button
            onClick={() => dispatch(callActions.toggleScreenShare())}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
              isScreenSharing ? "bg-nova-500/30 text-nova-300" : "bg-white/10 text-white"
            }`}
          >
            <FiMonitor size={20} />
          </button>

          <button
            onClick={handleEndCall}
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white transition-colors shadow-lg"
          >
            <FiPhoneOff size={24} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
